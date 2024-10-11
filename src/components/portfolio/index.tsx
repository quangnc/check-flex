import { AgGridReact } from "ag-grid-react";
import { Form } from "antd";
import axios from "axios";
import { default as Accounts } from "components/account-search";
import ModalComponent from "components/modal";
import { NoRowOverlay } from "components/price-board/overlay/no-row.overlay";
import StockSearch, { ESearchFiltered, WidgetLists } from "components/stock-search";
import { SVGIcons } from "components/svg-icons";
import UseToastSSI, { EToastTypes } from "components/toast";
import { ASSET_TYPE, EOrderZone, SYMBOL_SEARCH_ERROR } from "constants/common";
import { MIN_EVEN_LOT_QTY } from "constants/equity-order";
import { SystemConfigCategory, SystemConfigCode } from "constants/price-board";
import { Exchange } from "constants/stock";
import * as FlexLayout from "flexlayout-react";
import { useHandleKeyDown } from "hooks/use-handle-key-down";
import { debounce, throttle } from "lodash";
import moment from "moment-timezone";
import { useLayoutContext } from "providers/layout";
import { useOrderSocketContext } from "providers/order-socket";
import { useSocketContext } from "providers/socket";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "redux-toolkit";
import { Account, EquityOrderService } from "services/equity-order.service";
import { PortfolioService } from "services/portfolio.service";
import { StockService } from "services/stock.service";
import { EPermission, IStockSearch } from "types";
import { Order } from "types/equity-order-book";
import {
  EPortFolioFocusIndex,
  EPortfolio,
  IPortfolioExcel,
  IStockPortfolios,
} from "types/portfolio";
import { SocketTopic, WsDataType } from "types/socket";
import { EWidgetName } from "types/widget";
import { getTotalVolumn } from "util/asset-portfolio";
import { exportCSVBinary, parseNumberRender } from "util/common.util";
import { createQuantityArray, getOrderError } from "util/equity-order";
import {
  formatOrderPrice,
  numberToString,
  parseVolRender,
  stringToNumber,
} from "util/format-data.util";
import { parseBoardingDataRealtime } from "util/price-board/parse-data";
import { v4 as uuidv4 } from "uuid";
import portfolioColDefs, { getWidthByLength, isShowButtonSell } from "./column-def";
import PlaceSellOrderModal from "./place-sell-order";
import SellModal from "./sell-modal";
import styles from "./styles.module.scss";
import cx from "classnames";

type Props = {
  linkId: number;
  linkAccountId?: string;
  node: FlexLayout.TabNode;
};

export const defaultQuantityRatio = 1;
export const defaultPriceType = EPortfolio.FLOOR;

export default React.memo(function Portfolio({ linkAccountId, linkId, node }: Props) {
  const [account, setAccount] = useState<Account>();
  const [errorAccount, setErrorAccount] = useState("");
  const [isExpand, setIsExpand] = useState<boolean>(false);
  const [isOpenSellModal, setIsOpenSellModal] = useState<boolean>(false);
  const [isOpenPlaceSellOrderModal, setIsOpenPlaceSellOrderModal] = useState<boolean>(false);
  const [data, setData] = useState<any[]>([]);
  const [assetApiData, setAssetApiData] = useState([]);
  const [assetSymbols, setAssetSymbols] = useState<string[]>([]);
  const [isGridReady, setIsGridReady] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<any[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);
  const [assetPortfolioPermission, setAssetPortfolioPermission] = useState([]);
  const [isDisableSellBtn, setIsDisableSellBtn] = useState(true);
  const [isDisableSellAllBtn, setIsDisableSellAllBtn] = useState(false);
  const [quantityRatio, setQuantityRatio] = useState<number | string>(defaultQuantityRatio);
  const [priceType, setPriceType] = useState<string>(defaultPriceType);
  const [lastQueryTime, setLastQueryTime] = useState(null);
  const [stockInputValue, setStockInputValue] = useState("");
  const [searchSymbol, setSearchSymbol] = useState<string>("");
  const [isSearchSymbol, setIsSearchSymbol] = useState<boolean>(false);
  const [isSearchAccount, setIsSearchAccount] = useState<boolean>(false);
  const [idData, setIdData] = useState([]);
  const language = useAppSelector(state => state.language.lang);
  const { permissions } = useAppSelector(state => state.widget);
  const { activeUserCore } = useAppSelector(state => state.user.userInfo);
  const { isInPreMarketTime, differentTime } = useAppSelector(status => status.time);
  const { sessionsByExchange } = useAppSelector(state => state.session);
  const systemConfig = useAppSelector(state => state.systemConfig.systemConfig) || [];
  const { socket, isConnected, addComponent, removeComponent } = useSocketContext();
  const { socket: orderSocket, isConnected: isOrderConnected } = useOrderSocketContext();
  const { changeLinkData } = useLayoutContext();
  const { t, i18n } = useTranslation();
  const gridRef = useRef(null);
  const timeoutRef = useRef(null);
  const tableRef = useRef({});
  const dataRef = useRef([]);
  const [form] = Form.useForm();
  const accountRef = useRef(null);
  const selectedSymbolsRef = useRef<string[]>(null);
  const isExpandRef = useRef<boolean>(null);
  const symbolRef = useRef(null);
  const [currentFocus, setCurrentFocus] = useState<number>();
  const { onKeyDown } = useHandleKeyDown();
  const [linkAccount, setLinkAccount] = useState("");
  const [symbolError, setSymbolError] = useState<string>("");

  node["selectedSymbols"] = selectedSymbolsRef.current ?? node["selectedSymbols"];
  node["isExpand"] = isExpandRef.current ?? node["isExpand"];
  node["symbol"] = symbolRef.current ?? node["symbol"];

  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();

  const limitOrder = useMemo(() => {
    const sysMaxOrderSell = systemConfig.find(
      sys =>
        sys.category === SystemConfigCategory.Portfolio &&
        sys.code === SystemConfigCode.MaxOrderSell
    );
    return +sysMaxOrderSell?.value;
  }, [systemConfig]);

  const orderSettings = useMemo(() => {
    const sysMaxOrderSell = systemConfig.find(
      sys =>
        sys.category === SystemConfigCategory.Order && sys.code === SystemConfigCode.EquityOrder
    );
    const valueSetting = sysMaxOrderSell?.value;
    return {
      hose: +valueSetting?.maxQtyForHOSE?.value,
      hnx: +valueSetting?.maxQtyForHNX?.value,
      maxOrder: +valueSetting?.maxOrderPerTime?.value,
    };
  }, [systemConfig]);

  const handleGetAccountInfo = async () => {
    try {
      const accountInfoByViewOrderZone = await EquityOrderService.getAccounts(
        activeUserCore?.id,
        linkAccountId,
        EOrderZone.KEY_ORDER_ZONE
      );
      if (accountInfoByViewOrderZone?.data) {
        accountRef.current = accountInfoByViewOrderZone?.data;
        setAccount(accountInfoByViewOrderZone?.data);
        form.setFieldValue(
          "account",
          `${accountInfoByViewOrderZone?.data?.refAccountId} - ${accountInfoByViewOrderZone?.data?.client?.name}`
        );
        setLinkAccount(null);
        return;
      }
    } catch (error) {
      setLinkAccount(linkAccountId);
      if (error?.response?.status === 404) {
        setErrorAccount("EquityOrder:Error:ERR_TRADING_1018");
      } else {
        setErrorAccount("AssetDetailEquity:Error:ERR_ASSET_1000");
      }
    }
  };

  const handleSelectSearch = (selected: IStockSearch) => {
    setSearchSymbol(selected.symbol);
    setStockInputValue(selected.symbol);
    form.setFieldValue("stock", selected.symbol);
    node["symbol"] = selected.symbol;
    symbolRef.current = selected.symbol;
    if (!isSearchSymbol) setIsSearchSymbol(true);
  };

  useEffect(() => {
    accountRef.current = account;
    setAccount(account);
    setIsSearchAccount(true);
    if (account) {
      changeLinkData({ accountId: account?.refAccountId || "" }, linkId);
    }
  }, [account]);

  const isFullWidthRow = useCallback(params => params.rowNode?.data?.fullWidth, []);

  const transColResize = useCallback(dataRows => {
    const maxGainLossElement = dataRows.reduce(
      (prev, curr) => {
        return {
          gainLoss: Math.max(curr.gainLoss, prev.gainLoss),
          instrumentID: Math.max(curr.instrumentID, prev.instrumentID),
          marketPrice: Math.max(curr.marketPrice, prev.marketPrice),
          vol: Math.max(curr.vol, prev.vol),
        };
      },
      { gainLoss: 120, instrumentID: 58, marketPrice: 62, vol: 62 }
    );
    return maxGainLossElement;
  }, []);

  const getColRowData = useCallback(ref => {
    const dataRowNode = [];

    ref.current?.api?.forEachNode(rowNode => {
      const valMarketPrice = parseVolRender(+rowNode.data["marketPrice"]);
      const valGainLoss = `${parseVolRender(rowNode.data["gainLoss"])} (${parseNumberRender(
        rowNode.data["gainLossPercent"]
      )}%)`;
      const valVol = parseVolRender(rowNode.data["vol"]);
      dataRowNode.push({
        gainLoss: getWidthByLength(valGainLoss, 120),
        instrumentID: getWidthByLength(rowNode.data["instrumentID"]?.toString(), 58),
        marketPrice: getWidthByLength(valMarketPrice?.toString(), 62),
        vol: getWidthByLength(valVol?.toString(), 63),
      });
    });
    return dataRowNode;
  }, []);

  const autoResize = useCallback(() => {
    const dataRows = getColRowData(gridRef);
    const colResize = transColResize(dataRows);
    const columnLimits = Object.keys(colResize).map(key => ({
      key,
      minWidth: colResize[key],
    }));

    gridRef.current?.api?.sizeColumnsToFit({
      columnLimits: columnLimits,
    });
  }, [gridRef]);

  const handleGetDataToSell = (type: "selected" | "all") => {
    setPriceType(defaultPriceType);
    setQuantityRatio(defaultQuantityRatio);
    const selectedRows = [];
    gridRef.current?.api?.forEachNode(rowNode => {
      if ((type === "selected" && rowNode.selected) || (type === "all" && rowNode.selectable)) {
        selectedRows.push(convertAssetData(rowNode.data));
      }
    });
    if (limitOrder) {
      if (selectedRows.length > limitOrder) {
        UseToastSSI({
          message: t("Portfolio:Limit order", { limit: limitOrder }),
          options: {
            type: EToastTypes.error,
          },
        });
        return;
      }
    }
    if (type === "all") {
      gridRef.current?.api?.selectAll();
    }
    if (selectedRows.length > 0) {
      setSelectedSymbols(selectedRows);
      setIsOpenSellModal(true);
    }
  };

  const btnSellClick = () => handleGetDataToSell("selected");

  const btnSellAllClick = () => handleGetDataToSell("all");

  const btnRowSellClick = params => {
    const row = tableRef.current?.[`${params?.instrumentID}_${params?.rowId}`];
    const soldAsset: any[] = new Array(convertAssetData(row));
    setSelectedSymbols(soldAsset);
    setIsOpenSellModal(true);
    setPriceType(defaultPriceType);
    setQuantityRatio(defaultQuantityRatio);
  };

  const colDefs = useMemo(
    () =>
      portfolioColDefs({
        btnSellClick,
        btnSellAllClick,
        btnRowSellClick,
        isInPreMarketTime,
        isExpand,
        isDisableSellBtn,
        isDisableSellAllBtn,
        isHavePlaceOrderPermission: assetPortfolioPermission.includes(EPermission.PLACE_ORDER),
        isFilter: !!searchSymbol,
        gridRef,
      }),
    [
      gridRef,
      isExpand,
      isInPreMarketTime,
      isDisableSellBtn,
      isDisableSellAllBtn,
      assetPortfolioPermission,
      searchSymbol,
    ]
  );

  const convertAssetData = assetData => {
    const sellableQuantity = assetData.sellableQty;
    const exchange = assetData.exchange;
    const maxQtyForExchange = exchange === Exchange.HOSE ? orderSettings.hose : orderSettings.hnx;
    const maxQuantity =
      sellableQuantity > maxQtyForExchange * orderSettings.maxOrder
        ? maxQtyForExchange * orderSettings.maxOrder
        : sellableQuantity;
    const quantity =
      maxQuantity >= MIN_EVEN_LOT_QTY
        ? Math.floor(maxQuantity / MIN_EVEN_LOT_QTY) * MIN_EVEN_LOT_QTY
        : Math.floor(maxQuantity);
    return {
      symbol: assetData.instrumentID,
      exchange: assetData.exchange,
      session: assetData.session,
      stockType: assetData.stockType,
      tradingStatus: assetData.tradingStatus,
      sellableQty: parseVolRender(assetData.sellableQty),
      ceiling: formatOrderPrice(assetData.ceiling),
      floor: formatOrderPrice(assetData.floor),
      refPrice: formatOrderPrice(assetData.refPrice),
      price: assetData.floor
        ? formatOrderPrice(assetData.floor)
        : formatOrderPrice(assetData.refPrice),
      quantity: parseVolRender(quantity),
      maxQuantity: maxQuantity,
    };
  };

  const handleFormatOrderData = () => {
    const dataToOrder = [];
    selectedSymbols.forEach(e => {
      const maxQtyForExchange =
        e?.exchange === Exchange.HOSE ? orderSettings.hose : orderSettings.hnx;
      const error = getOrderError(e?.price, e?.quantity, {
        ...e,
        isInPreMarketTime,
      });
      if (!error) {
        const a = createQuantityArray(+stringToNumber(e?.quantity), maxQtyForExchange);
        a.forEach(element => {
          const newOrder = { ...e, quantity: numberToString(element) };
          dataToOrder.push(newOrder);
        });
      }
    });
    setOrderData(dataToOrder);
    setIsOpenPlaceSellOrderModal(true);
  };

  const exportAssetPortfolioList = async () => {
    const assetListExcel: Array<IStockPortfolios> = [];
    const total = {
      cost: "",
      market: "",
      profitLoss: "",
      profitLossPercent: "",
    };
    if (data?.length === 0) {
      assetListExcel.push({
        instrumentID: null,
        totalVol: null,
        sellableQty: null,
        avgPrice: null,
        marketPrice: null,
        costValue: null,
        marketValue: null,
        gainLoss: null,
        gainLossPercentage: null,
      });
    } else {
      const isFilter = !!searchSymbol;
      let totalMarketValueIfFilter = 0;
      let totalValueIfFilter = 0;
      let totalGainLossIfFilter = 0;

      data.forEach(e => {
        const currentRow = tableRef.current?.[`${e.instrumentID}_${e?.rowId}`];
        const element: IStockPortfolios = {
          instrumentID: currentRow?.instrumentID,
          totalVol: currentRow?.vol,
          sellableQty: currentRow?.sellableQty,
          avgPrice: currentRow?.avgPrice,
          marketPrice: currentRow?.marketPrice,
          costValue: currentRow?.value,
          marketValue: currentRow?.marketValue,
          gainLoss: currentRow?.gainLoss,
          gainLossPercentage: currentRow?.gainLossPercent?.toFixed(2),
        };
        if (isFilter) {
          totalMarketValueIfFilter += currentRow?.marketValue;
          totalValueIfFilter += currentRow?.value;
          totalGainLossIfFilter += currentRow?.gainLoss;
        }
        assetListExcel.push(element);
      });
      total.cost = isFilter ? totalValueIfFilter : tableRef.current?.["footer"].value;
      total.market = isFilter ? totalMarketValueIfFilter : tableRef.current?.["footer"].marketValue;
      total.profitLoss = isFilter ? totalGainLossIfFilter : tableRef.current?.["footer"].gainLoss;
      total.profitLossPercent = isFilter
        ? ((totalGainLossIfFilter / totalValueIfFilter) * 100).toFixed(2)
        : tableRef.current?.["footer"].gainLossPercent?.toFixed(2);
    }
    const dataExcel: IPortfolioExcel = {
      account: account?.refAccountId || "",
      stockPortfolios: assetListExcel,
      total,
    };
    try {
      const response = await PortfolioService.exportPortfolioExcel(
        language,
        activeUserCore.id,
        dataExcel
      );
      exportCSVBinary(
        response.data,
        `SSI iBroker Portfolio${account?.refAccountId ? `_${account?.refAccountId}` : ""}`
      );
    } catch (error) { }
  };

  const handleGetRowId = useCallback(rowInfo => {
    if (rowInfo.data?.id === "footer") {
      return "footer";
    }
    return rowInfo.data?.rowId;
  }, []);

  const handleGetValueStock = debounce(text => {
    setStockInputValue(text);
  });

  const handleExpandTable = () => {
    isExpandRef.current = !isExpand;
    node["isExpand"] = !isExpand;
    setIsExpand(prev => !prev);
  };

  const getAssetPortfolio = async (isClickQuery: boolean = false) => {
    if (isClickQuery) {
      try {
        await form.validateFields();
      } catch (error) { }
    }
    if (!account || !account?.refAccountId || !activeUserCore) {
      gridRef.current?.api?.setPinnedBottomRowData([]);
      setAssetApiData([]);
      setData([]);
      dataRef.current = [];
      setAssetSymbols([]);
      return;
    }
    try {
      const response = await PortfolioService.getPortfolio(
        account.refAccountId,
        activeUserCore.id,
        source.token
      );
      const assetPortfolioApi = response.data.stockPositions || [];
      if (assetPortfolioApi.length > 0) {
        const symbolArray = assetPortfolioApi.map(e => e.instrumentID);
        let totalPrice = 0;
        let symbolDataObject = {};
        const idDataTmp = [];
        const assetApiDataTmp = assetPortfolioApi.map(e => {
          const rowId = uuidv4();
          idDataTmp.push({ symbol: e.instrumentID, rowId });
          const vol = getTotalVolumn(e);
          const value = e.avgPrice * vol || 0;
          totalPrice += value;
          const newData = { ...e, vol, value, rowId };
          symbolDataObject = {
            ...symbolDataObject,
            [`${e.instrumentID}_${rowId}`]: newData,
          };
          return { ...e, rowId };
        });
        setIdData(idDataTmp);
        const footerBoard = {
          gainLoss: 0,
          id: "footer",
          marketValue: 0,
          value: totalPrice,
        };
        tableRef.current = { ...symbolDataObject, footer: footerBoard };
        const now = Date.now();
        setLastQueryTime(moment(now + differentTime).format("HH:mm:ss"));
        setAssetSymbols(symbolArray);
        setAssetApiData(assetApiDataTmp);
      } else {
        setAssetApiData([]);
        setData([]);
        dataRef.current = [];
        setAssetSymbols([]);
      }
    } catch (error) { }
  };

  // limit api in 1 second
  const getAssetPortfolioThrottle = useCallback(throttle(getAssetPortfolio, 1000), [
    getAssetPortfolio,
  ]);

  const filterAsset = () => {
    if (assetApiData.length === 0) return;
    const isFilter = !!searchSymbol;
    if (searchSymbol) {
      setIsSearchSymbol(true);
    }
    const assetDataTmp = isFilter
      ? assetApiData.filter(e => e?.instrumentID === searchSymbol)
      : assetApiData;
    if (assetDataTmp.length === 0) {
      gridRef.current?.api?.setPinnedBottomRowData([]);
      setData([]);
      dataRef.current = [];
      return;
    }
    const shownData = assetDataTmp.map(e => {
      return tableRef.current?.[`${e.instrumentID}_${e.rowId}`];
    });
    setData(shownData);
    dataRef.current = shownData;
  };

  const getStockData = async symbols => {
    if (symbols.length === 0) return;
    try {
      const response = await StockService.getMultiple(symbols);
      response.data.data.forEach(e => handleDataTable(e, e.stockSymbol));
    } catch (error) { }
  };

  const handleCalculateTotal = () => {
    if (dataRef.current.length <= 0) return;
    let totalMarketValueTmp = 0;
    let totalGainLoss = 0;
    let totalMarketValueIfFilter = 0;
    let totalValueIfFilter = 0;
    let totalGainLossIfFilter = 0;
    const isFilter = !!searchSymbol;
    Object.entries<any>(tableRef.current)?.forEach(([key, value]) => {
      if (key === "footer") return;
      const elementValue = value?.marketValue || 0;
      const elementGainLoss = value?.gainLoss || 0;
      totalMarketValueTmp += elementValue;
      totalGainLoss += elementGainLoss;
      if (isFilter && value?.instrumentID === searchSymbol) {
        totalMarketValueIfFilter += elementValue;
        totalGainLossIfFilter += elementGainLoss;
        totalValueIfFilter += value?.value || 0;
      }
    });
    const footerData = tableRef.current?.["footer"];
    const newDataFooter = {
      ...footerData,
      marketValue: totalMarketValueTmp,
      gainLoss: totalGainLoss,
      gainLossPercent: footerData?.value ? (totalGainLoss / footerData?.value) * 100 : 100,
    };
    const newTableRef = {
      ...tableRef.current,
      footer: newDataFooter,
    };
    tableRef.current = newTableRef;
    if (accountRef.current) {
      const shownFooterData = isFilter
        ? {
          gainLoss: totalMarketValueIfFilter,
          id: "footer",
          marketValue: totalMarketValueIfFilter,
          value: totalValueIfFilter,
          gainLossPercent: totalValueIfFilter
            ? (totalMarketValueIfFilter / totalValueIfFilter) * 100
            : 100,
        }
        : newDataFooter;
      gridRef.current?.api?.setPinnedBottomRowData([shownFooterData]);
    }
    handleCalculateWeight(totalMarketValueTmp);
  };

  const handleCalculateFooter = useCallback(throttle(handleCalculateTotal, 1000), [
    node,
    data,
    account,
    searchSymbol,
  ]);

  const handleDataTable = (newDataTable, symbolCurrent) => {
    const idDataBySymbol = idData.filter(id => id.symbol === symbolCurrent);
    idDataBySymbol.forEach(currentId => {
      const row = tableRef.current?.[`${symbolCurrent}_${currentId?.rowId}`];
      const marketPrice = newDataTable.matchedPrice
        ? newDataTable?.matchedPrice
        : newDataTable?.refPrice
          ? newDataTable?.refPrice
          : row?.refPrice;
      const marketValue = row?.vol < 0 ? 0 : marketPrice * row?.vol;
      const gainLoss = row?.avgPrice ? marketValue - row?.value : marketValue;
      const gainLossPercent = row?.value ? (gainLoss / row?.value) * 100 : 100;
      const sessionByExchange = sessionsByExchange.find(e => e?.exchange === row?.exchange);
      const newData = {
        ...row,
        tradingStatus: newDataTable?.tradingStatus,
        exchange: row?.exchange || newDataTable?.exchange,
        stockType: row?.session || newDataTable?.stockType,
        marketPrice,
        marketValue,
        gainLoss,
        gainLossPercent,
        ceiling: newDataTable?.ceiling ? newDataTable?.ceiling : row?.ceiling,
        floor: newDataTable?.floor ? newDataTable?.floor : row?.floor,
        refPrice: newDataTable?.refPrice ? newDataTable?.refPrice : row?.refPrice,
        session: sessionByExchange?.session || row?.session || newDataTable?.session,
      };
      const newTableRef = {
        ...tableRef.current,
        [`${symbolCurrent}_${currentId?.rowId}`]: newData,
      };
      tableRef.current = newTableRef;
    });
    handleCalculateFooter();
  };

  const handleData = socketData => {
    if (socketData.data?.startsWith(WsDataType.boarding) && accountRef.current) {
      const symbolTmp = socketData.data?.slice(2, 5);
      if (assetSymbols.includes(symbolTmp)) {
        const wsDataArray = socketData?.data?.split("|");
        const wsData = parseBoardingDataRealtime(wsDataArray);
        handleDataTable(wsData, wsData.id);
      }
    }
  };

  const onSelectionChanged = useCallback(() => {
    const selectedRows = gridRef.current!.api.getSelectedRows();
    if (selectedRows.length > 0) {
      const selectedSymbol = selectedRows.map(e => e.instrumentID);
      selectedSymbolsRef.current = selectedSymbol;
      node["selectedSymbols"] = selectedSymbol;
      setIsDisableSellBtn(false);
    } else {
      setIsDisableSellBtn(true);
      selectedSymbolsRef.current = [];
      node["selectedSymbols"] = [];
    }
  }, [node]);

  const reloadDataAfterSell = () => {
    setIsOpenPlaceSellOrderModal(false);
    node["selectedSymbols"] = [];
    selectedSymbolsRef.current = [];
  };

  const handleCalculateWeight = (total: number) => {
    const selectedSymbolsTmp = node["selectedSymbols"] || [];
    let isDisableSellAll = true;
    Object.entries<any>(tableRef.current)?.forEach(([key, value]) => {
      if (key === "footer") return;
      const dataRowCurrent = { ...value, isInPreMarketTime };
      if (isShowButtonSell(dataRowCurrent)) {
        isDisableSellAll = false;
      }
      const weight = (value?.marketValue / total) * 100;
      const rowTable = gridRef.current?.api?.getRowNode(value?.rowId);
      const newData = {
        ...value,
        weight,
      };
      const newTableRef = {
        ...tableRef.current,
        [`${key}`]: newData,
      };
      tableRef.current = newTableRef;
      rowTable?.updateData(newData);
      if (selectedSymbolsTmp.includes(value?.instrumentID)) {
        rowTable?.setSelected(true);
      }
    });
    setIsDisableSellAllBtn(isDisableSellAll);
  };

  const handleUpdateSession = () => {
    Object.entries<any>(tableRef.current)?.forEach(([key, value]) => {
      if (key === "footer") return;
      const rowTable = gridRef.current?.api?.getRowNode(value?.rowId);
      const sessionByExchange = sessionsByExchange.find(e => e?.exchange === value?.exchange);
      const newData = {
        ...value,
        session: sessionByExchange?.session || value?.session,
      };
      const newTableRef = {
        ...tableRef.current,
        [`${key}`]: newData,
      };
      tableRef.current = newTableRef;
      rowTable?.updateData(newData);
    });
  };

  const handleWsData = useCallback(
    (e: MessageEvent) => {
      const dataWS: Order = JSON.parse(e.data);
      if (dataWS?.accountId === account?.refAccountId) getAssetPortfolioThrottle();
    },
    [account]
  );

  useEffect(() => {
    if (isGridReady) {
      handleUpdateSession();
    }
  }, [sessionsByExchange, isGridReady]);

  useEffect(() => {
    if (isGridReady) {
      getStockData(assetSymbols);
    }
  }, [assetSymbols, isGridReady, data]);

  useEffect(() => {
    if (isSearchAccount) {
      selectedSymbolsRef.current = [];
      node["selectedSymbols"] = [];
    }
    getAssetPortfolio();
    return () => source.cancel();
  }, [account?.refAccountId, account]);

  useEffect(() => {
    filterAsset();
  }, [assetApiData, searchSymbol]);

  useEffect(() => {
    if (!stockInputValue && isSearchSymbol) {
      setSearchSymbol("");
      node["symbol"] = "";
      symbolRef.current = "";
    }
  }, [stockInputValue]);

  useEffect(() => {
    setTimeout(autoResize, 100);
    window.addEventListener("resize", autoResize);
    return () => {
      window.removeEventListener("resize", autoResize);
    };
  }, []);

  useEffect(() => {
    if (data?.length > 0) {
      setTimeout(autoResize, 100);
    }
  }, [gridRef?.current, data]);

  useEffect(() => {
    const autoResizeWithTimeout = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(autoResize, 100);
    };
    node.setEventListener("resize", autoResizeWithTimeout); // use timeout because event trigger before resize

    return () => {
      node.removeEventListener("resize");
    };
  }, [node]);

  useEffect(() => {
    const isExpandTmp = node["isExpand"];
    setIsExpand(isExpandTmp);

    const symbolTmp = node["symbol"];
    setSearchSymbol(symbolTmp);
    setStockInputValue(symbolTmp);
    form.setFieldValue("stock", symbolTmp);
  }, [node]);

  useEffect(() => {
    autoResize();
  }, [isExpand, gridRef]);

  useEffect(() => {
    if (isGridReady) {
      addComponent({
        topic: SocketTopic.STOCK_REALTIME_BY_LIST_V2,
        variables: assetSymbols,
      });
    }
    return () =>
      removeComponent({
        topic: SocketTopic.STOCK_REALTIME_BY_LIST_V2,
        variables: assetSymbols,
      });
  }, [socket, isConnected, assetSymbols, isGridReady]);

  useEffect(() => {
    if (socket && isConnected) {
      socket.addEventListener("message", handleData);
    }
    return () => {
      if (socket) {
        socket?.removeEventListener("message", handleData);
      }
    };
  }, [socket, isConnected, assetSymbols, sessionsByExchange, searchSymbol]);

  useEffect(() => {
    if (orderSocket && isOrderConnected && account) {
      orderSocket.addEventListener("message", handleWsData);
      return () => {
        orderSocket.removeEventListener("message", handleWsData);
      };
    }
  }, [orderSocket, isOrderConnected, account]);

  useEffect(() => {
    const customerGroupPermissionTmp =
      permissions.find(e => e.name === EWidgetName.ASSET_PORTFOLIO_EQUITY)?.userActions || [];
    setAssetPortfolioPermission(customerGroupPermissionTmp);
  }, [permissions]);

  useEffect(() => {
    if (!linkAccountId) {
      accountRef.current = {};
      setAccount(null);
      setLinkAccount(null);
      setErrorAccount(null);
    }
    if (!linkAccountId) return;
    const accountError = form.getFieldError("account");
    if (accountError.length > 0) {
      form.setFields([{ name: "account", errors: [] }]);
    }
    handleGetAccountInfo();
  }, [linkAccountId]);

  useEffect(() => {
    const errorFields = form
      .getFieldsError()
      .reduce((arr, field) => (field.errors.length && arr.push(field.name), arr), []);

    form.validateFields(errorFields);
  }, [i18n.language]);

  return (
    <div className={styles.wrapper}>
      <Form
        form={form}
        className={cx("flex items-start justify-between w-full gap-2 h-fit", {
          [styles?.wrapWidth]: symbolError !== "",
        })}
      >
        <div className="flex flex-wrap items-start w-full gap-2">
          <div className="w-[200px]">
            <Form.Item
              name="account"
              rules={[
                {
                  required: true,
                  message: t("EquityOrder:Error:Required", {
                    field: t("EquityOrder:Account"),
                  }),
                },
              ]}
            >
              <Accounts
                account={account}
                setAccount={setAccount}
                cbNotAccount={() => changeLinkData({ accountId: "" }, linkId)}
                setFilterParams={() => { }}
                setAccountError={setErrorAccount}
                type={ASSET_TYPE}
                onChange={text => {
                  form.setFieldValue("account", text);
                }}
                focusIndex={EPortFolioFocusIndex.Account}
                onKeyDown={e =>
                  onKeyDown(e, EPortFolioFocusIndex.Symbol, currentFocus, setCurrentFocus)
                }
                currentFocus={currentFocus}
                setCurrentFocus={setCurrentFocus}
                searchByAccount={EOrderZone.KEY_ORDER_ZONE}
                linkAccount={linkAccount}
                setLinkAccount={setLinkAccount}
              />
            </Form.Item>
            {errorAccount && (
              <div
                className={`text-[#ff4d4f] text-xs flex items-center ${symbolError ? "" : "whitespace-nowrap"
                  }`}
              >
                {t(errorAccount)}
              </div>
            )}
          </div>
          <div className="h-6 w-fit">
            <Form.Item
              name="stock"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) {
                      setSymbolError("");
                      return Promise.resolve();
                    }
                    if (symbolError === SYMBOL_SEARCH_ERROR) {
                      return Promise.reject(
                        t("EquityOrder:Error:Invalid Symbol", {
                          field: t("PriceBoard:Header:Symbol"),
                        })
                      );
                    }
                    setSymbolError("");

                    return Promise.resolve();
                  },
                },
              ]}
            >
              <StockSearch
                handleSelect={handleSelectSearch}
                searchValueFilteredBy={ESearchFiltered.EQUITY_ORDER}
                isAutocomplete
                propsOnChange={handleGetValueStock}
                selectTextOnFocus
                widgetName={WidgetLists.PORTFOLIO}
                focusIndex={EPortFolioFocusIndex.Symbol}
                onKeyDown={e =>
                  onKeyDown(e, EPortFolioFocusIndex.Symbol, currentFocus, setCurrentFocus)
                }
                currentFocus={currentFocus}
                setCurrentFocus={setCurrentFocus}
                setError={setSymbolError}
              />
            </Form.Item>
          </div>
          <div className="flex gap-2">
            <div className={styles.button} onClick={handleExpandTable}>
              {isExpand ? t("Portfolio:Collapse") : t("Portfolio:Expand")}
            </div>
            <button
              className="btn btn-red rounded-[3px] h-6 px-2 min-w-max text-xs flex justify-center items-center cursor-pointer"
              onClick={() => getAssetPortfolio(true)}
            >
              {t("Portfolio:Query")}
            </button>
          </div>
        </div>
        <div className="flex justify-start gap-2">
          {lastQueryTime && (
            <div className="flex items-center text-xs w-fit whitespace-nowrap text-neutral-500">{`${t(
              "Portfolio:Last query time"
            )}: ${lastQueryTime}`}</div>
          )}
          {assetPortfolioPermission.includes(EPermission.EXPORT) && (
            <SVGIcons.IconExportExcel
              fill={"#078c54"}
              onClick={e => exportAssetPortfolioList()}
              className="cursor-pointer"
              width={24}
              height={24}
            />
          )}
        </div>
      </Form>
      <div
        className="table-grid portfolio"
        style={{
          height: window?.["node"] ? "calc(100vh - 50px)" : "100%",
          marginTop: symbolError ? 10 : 0,
        }}
      >
        <div className="w-full h-full ag-theme-alpine">
          <AgGridReact
            ref={gridRef}
            columnDefs={colDefs}
            rowData={data}
            headerHeight={24}
            rowHeight={28}
            noRowsOverlayComponent={NoRowOverlay}
            onGridReady={ref => {
              ref.api.sizeColumnsToFit();
              setIsGridReady(true);
            }}
            getRowId={handleGetRowId}
            rowSelection="multiple"
            suppressRowClickSelection
            onSelectionChanged={onSelectionChanged}
            isRowSelectable={params => {
              if (!assetPortfolioPermission.includes(EPermission.PLACE_ORDER)) return false;
              if (params.data.id === "footer") return false;
              return isShowButtonSell({ ...params?.data, isInPreMarketTime });
            }}
            isFullWidthRow={isFullWidthRow}
            suppressCellFocus
          />
        </div>
      </div>
      {isOpenSellModal && (
        <ModalComponent
          title={
            <div className="px-6 py-1.5 text-sm dark:text-white font-semibold">
              {t("Portfolio:Sell modal title")}
            </div>
          }
          isOpen={isOpenSellModal}
          children={
            <SellModal
              priceType={priceType}
              setPriceType={setPriceType}
              quantityRatio={quantityRatio}
              setQuantityRatio={setQuantityRatio}
              account={account}
              orderData={selectedSymbols}
              setOrderData={setSelectedSymbols}
              onClose={() => setIsOpenSellModal(false)}
              onOpenPlaceSellOrder={handleFormatOrderData}
              node={node}
            />
          }
          onClose={() => setIsOpenSellModal(false)}
          classnames={"w-fit"}
          closable={true}
        />
      )}
      {isOpenPlaceSellOrderModal && (
        <ModalComponent
          title={
            <div className="px-6 py-1.5 text-sm dark:text-white font-semibold">
              {t("Portfolio:Confirm sell order")}
            </div>
          }
          isOpen={isOpenPlaceSellOrderModal}
          children={
            <PlaceSellOrderModal
              account={account}
              orderData={orderData}
              linkId={linkId}
              onBack={() => {
                setIsOpenSellModal(true);
                setIsOpenPlaceSellOrderModal(false);
              }}
              onGetAssetPortfolio={getAssetPortfolio}
              onSell={reloadDataAfterSell}
            />
          }
          onClose={() => setIsOpenPlaceSellOrderModal(false)}
          classnames={"w-fit"}
          closable={true}
        />
      )}
    </div>
  );
});
