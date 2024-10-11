import { DragStoppedEvent, GetRowIdParams } from "ag-grid-community";
import { AxiosResponse } from "axios";
import AgTable from "components/ag-table";
import LoadingInContent from "components/loading-spinner/loading-content";
import UseToastSSI, { EToastTypes } from "components/toast";
import {
  COMPANY_SECTORS,
  COMPANY_SECTORS_DEFAULT,
  DAYS_BEFORE_X_DATE,
  DEFAULT_COLUMN_CONFIG,
  SystemConfigCategory,
  SystemConfigCode,
  TableType,
} from "constants/price-board/index";
import { defaultTableFormat } from "constants/price-board/table-format";
import { EListSessions } from "constants/session";
import { PriceBoardContextProvider } from "contexts/price-board";
import * as FlexLayout from "flexlayout-react";
import { useLocalStorage } from "hooks/useLocalStorage";
import { debounce, isEmpty } from "lodash";
import { useSocketContext } from "providers/socket";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, UserActions } from "redux-toolkit";
import { UserService } from "services";
import { JsonResponse } from "services/base-api.service";
import { StockService } from "services/stock.service";
import { SectorsData, StockGroupData, StockMultipleSortType } from "types";
import { SocketTopic, WsDataType } from "types/socket";
import { createDataUnderlying, formatPrice, THOUSAND_VND } from "util/format-data.util";
import { getColumnState, saveColumnState } from "util/price-board/column-state";
import { postSortRows } from "util/price-board/config-column";
import { convertDataBoardingSocket } from "util/price-board/convert-data-socket";
import { filterCoveredWarrant, sortDataCW } from "util/price-board/covered-warrant";
import { getMovedRows, saveMovedRows } from "util/price-board/move-rows";
import {
  formatVolumeOne,
  generatePriceChange,
  generatePriceChangePercent,
  parseBoardingDataRealtime,
  parseStartEndPriceSession,
} from "util/price-board/parse-data";
import { getCurrentPinRows } from "util/price-board/pin-rows";
import { getTableFormat } from "util/price-board/table-format";
import {
  getUserSettings,
  PriceTablesFormat,
  UserSettings,
  Watchlist,
} from "util/price-board/user-settings";
import { EtypeOfWsData, STypeOfWsData, WS_MESSAGGE_REFRESH_STOCK } from "util/socket";
import { saveWatchlist } from "util/watchlist";
import { columnConfig } from "./column-define";
import Leading from "./leading";
import { TableInfo } from "./leading/menu-list";
import PutThrough from "./put-through";
import { handleConvertSocketChartIndex } from "layouts/main/header/chart-index/util";
import { getMatchedVolume, getTextLength } from "util/common.util";

const MAX_EXCHANGE_WATCHLIST_DEFAULT = 100;
const KEY_FOOTER = "footer";

const RESP_DEFAULT_STOCK_GROUP: AxiosResponse<JsonResponse<StockGroupData[]>> = {
  data: {
    code: "",
    data: [],
    message: "",
  },
  headers: null,
  config: null,
  status: null,
  statusText: "",
};

const Footer = ({ node }) => {
  const { t } = useTranslation();
  const volumn = node.data.floor || defaultTableFormat.formatVolume;
  const value = node.data.refPrice || defaultTableFormat.formatValue;
  const newValue = {
    price: node.data?.tableInfo === TableType.derivatives ? "1" : "1,000",
    volume: node.data?.tableInfo === TableType.derivatives ? "1" : volumn.toLocaleString("en-US"),
    value: value.toLocaleString("en-US"),
  };

  const getContentFooter = useMemo(() => {
    switch (node.data?.tableInfo) {
      case TableType.derivatives:
        return t("PriceBoard:FooterDerivatives", { newValue });
      default:
        return t("PriceBoard:Footer", { newValue });
    }
  }, [node.data?.tableInfo, newValue]);

  return (
    <div className="text-xs text-[var(--board-footer-color)] bg-[var(--board-footer-bg-color)] h-full py-[0.1875rem] flex items-center justify-center">
      {getContentFooter}
    </div>
  );
};

export default React.memo(function PriceBoard({ node }: { node?: FlexLayout.TabNode }) {
  const gridRef = useRef(null);

  // putThrough gridRef
  const gridBids = useRef(null);
  const gridAsks = useRef(null);
  const gridMatched = useRef(null);
  const [totalTradVolume, setTotalTradingVolume] = useState(0);
  const [totalTradPrice, setTotalTradingPrice] = useState(0);

  const { t } = useTranslation();
  const [tableInfo, setTableInfo] = useState<TableInfo>(null);
  const [apiData, setApiData] = useState<StockGroupData[]>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [suppressNoRowsOverlay, setSuppressNoRowsOverlay] = useState(true);
  const watchlist = useAppSelector(state => state.user.userInfo?.userSettings?.watchlists) || [];
  const systemConfig = useAppSelector(state => state.systemConfig.systemConfig) || [];

  const tableFormat =
    useAppSelector(state => state?.user.userInfo?.userSettings?.priceTablesFormat) ||
    ({} as PriceTablesFormat);
  const { socket, isConnected, addComponent, removeComponent } = useSocketContext();
  const dispatch = useAppDispatch();
  const [stockListMultipleBoard, setStockListMultipleBoard] = useState<StockGroupData[]>([]);
  const [companySectors, setCompanySectors] = useLocalStorage(
    COMPANY_SECTORS,
    COMPANY_SECTORS_DEFAULT
  );

  const getRowId = useCallback((params: GetRowIdParams<any>) => params.data.id, []);
  const defaultColDef = useMemo(() => ({ sortable: true, resizable: true }), []);
  const listSymbol = useMemo(() => {
    if (!!apiData) return apiData.map(el => el.stockSymbol);
    return null;
  }, [apiData]);
  const maxExchangeWatchlist = useMemo(() => {
    const sysMaxExchangeWatchlist = systemConfig.find(
      sys =>
        sys.category === SystemConfigCategory.PriceBoard &&
        sys.code === SystemConfigCode.MaxExchangeCodePerWatchlist
    );
    return sysMaxExchangeWatchlist?.value ?? MAX_EXCHANGE_WATCHLIST_DEFAULT;
  }, [systemConfig]);

  useEffect(() => {
    staticCompanySectorsData();
  }, []);

  useEffect(() => {
    if (!gridRef.current) return;
    if (isLoading) {
      gridRef.current?.api?.showLoadingOverlay();
    } else if (apiData && apiData.length === 0) {
      setTimeout(() => gridRef.current?.api?.showNoRowsOverlay(), suppressNoRowsOverlay ? 100 : 0);
      setSuppressNoRowsOverlay(false);
    } else {
      gridRef.current?.api?.hideOverlay();
    }
  }, [isLoading, apiData]);

  useEffect(() => {
    if (!!tableInfo) {
      setSuppressNoRowsOverlay(true);
      if (tableInfo.tableType === TableType.putThrough) {
        setIsReady(false);
        setApiData(null);
        return;
      }
      gridRef.current?.api?.setRowData(null);
      gridRef.current?.api?.setPinnedTopRowData(null);
      gridRef.current?.api?.showNoRowsOverlay();
      fetchApiData();
    }
  }, [tableInfo]);

  useEffect(() => {
    if (isConnected && !!apiData) {
      if (tableInfo.tableType === "coveredWarrants") {
        addComponent({
          topic: SocketTopic.STOCK_REALTIME_BY_LIST_V2,
          variables: apiData
            .map(el => el.stockSymbol)
            .concat(stockListMultipleBoard.map(el => el.stockSymbol)),
        });
      } else {
        addComponent({
          topic: SocketTopic.STOCK_REALTIME_BY_LIST_V2,
          variables: apiData.map(el => el.stockSymbol),
        });
      }
      socket?.addEventListener("message", handleWsData);
    }
    return () => {
      if (!!apiData) {
        if (tableInfo.tableType === "coveredWarrants") {
          removeComponent({
            topic: SocketTopic.STOCK_REALTIME_BY_LIST_V2,
            variables: apiData
              .map(el => el.stockSymbol)
              .concat(stockListMultipleBoard.map(el => el.stockSymbol)),
          });
        } else {
          removeComponent({
            topic: SocketTopic.STOCK_REALTIME_BY_LIST_V2,
            variables: apiData.map(el => el.stockSymbol),
          });
        }
        socket?.removeEventListener("message", handleWsData);
      }
    };
  }, [isConnected, apiData, stockListMultipleBoard]);

  useEffect(() => {
    if (
      isReady &&
      gridRef.current &&
      !!tableInfo &&
      tableInfo?.tableType !== TableType.putThrough
    ) {
      getColumnConfig(tableInfo.tableType);
      handleResetTableWatchlist();
    }
  }, [isReady, tableInfo, watchlist]);

  const handleResetTableWatchlist = useCallback(() => {
    if (tableInfo?.tableType === TableType.watchlist && isEmpty(watchlist)) {
      gridRef.current?.api?.setRowData([]);
    }
  }, [tableInfo, watchlist]);

  useEffect(() => {
    handleChangeTableFormat(tableFormat);
  }, [tableFormat]);

  const staticCompanySectorsData = useCallback(async () => {
    try {
      const resSectorsData: AxiosResponse<
        JsonResponse<SectorsData[]>,
        any
      > = await StockService.getSectorsData();
      const sectorsData: SectorsData[] = resSectorsData.data?.data ?? [];
      setCompanySectors(sectorsData);
    } catch (error) {}
  }, []);

  const handleCreateColumnDefsFitContent = (columnDefs, rowData) => {
    let newColumnDefs = [];
    columnDefs?.forEach(element => {
      if (element?.children?.length) {
        const newElement = { ...element, children: [] };
        element?.children?.forEach(itemChildren => {
          let minWidth = itemChildren?.minWidth;
          rowData?.forEach(item => {
            let valueCell = item?.[itemChildren?.field];
            if (itemChildren?.field === "matchedVolume" && +valueCell) {
              valueCell = getMatchedVolume(valueCell, item?.exchange);
            }
            const textLength =
              valueCell && +valueCell ? getTextLength(formatPrice(valueCell), 12) + 16 : 0; //12 is fontSize, 16 is padding
            if (textLength > minWidth) minWidth = textLength;
          });
          newElement.children.push({ ...itemChildren, minWidth });
        });
        newColumnDefs.push(newElement);
      } else {
        newColumnDefs.push(element);
      }
    });
    return newColumnDefs;
  };

  const getColumnConfig = useCallback(
    (type: TableType) => {
      if (!tableInfo) return;
      const tableInfor = typeof tableInfo.data === "string" ? tableInfo.data : "coveredWarrants";
      const daysBeforeXDate = systemConfig.find(
        sys =>
          sys.category === SystemConfigCategory.PriceBoard &&
          sys.code === SystemConfigCode.DaysBeforeXDate
      );
      const preDay = daysBeforeXDate ? daysBeforeXDate.value : DAYS_BEFORE_X_DATE;
      let rowData = [];
      gridRef.current?.api?.forEachNode(itemNode => rowData.push(itemNode.data));
      const columnDefs = columnConfig(type, gridRef, tableInfor, preDay, handleRemoveStock) as any;
      let newColumnDefs = [];
      if (rowData?.length && columnDefs?.length) {
        newColumnDefs = handleCreateColumnDefsFitContent(columnDefs, rowData);
      }
      gridRef.current?.api?.setColumnDefs(newColumnDefs?.length ? newColumnDefs : columnDefs);
      const defaultConfig = DEFAULT_COLUMN_CONFIG[tableInfo.tableType];
      const userSettings = getUserSettings();
      let columnState = getColumnState(userSettings, tableInfo.tableType);
      const isMiniPriceTable = userSettings?.isMiniPriceTable;
      if (isMiniPriceTable) {
        const miniState = getColumnState(userSettings, TableType.mini);
        const miniColumns = miniState.map(el => el.colId);
        columnState = columnState.map(el => ({
          ...el,
          hide: !miniColumns.includes(el.colId),
        }));
      }
      gridRef.current?.columnApi?.applyColumnState({
        state: columnState.length > 0 ? columnState : defaultConfig,
        applyOrder: true,
      });
    },
    [tableInfo, watchlist]
  );

  const getListStocksActive = (newWatchlist: Watchlist[], id: string): string[] => {
    const watchlistActive = newWatchlist.find(wl => wl._id === id) || null;
    if (watchlistActive) {
      return watchlistActive.listStocks;
    }

    return [];
  };

  const debounceFnWatchlist = useCallback(
    debounce(async watchlists => {
      try {
        const userSettings = getUserSettings();
        await saveWatchlist(userSettings, watchlists);
      } catch (error) {}
    }, 100),
    []
  );

  const handleRemoveStock = async (stock: string) => {
    const newWatchlist = watchlist.map(wl => {
      if (wl._id === tableInfo?.data) {
        return { ...wl, listStocks: wl.listStocks.filter(wlStock => wlStock !== stock) };
      }

      return wl;
    });
    const listStocks = getListStocksActive(newWatchlist, tableInfo?.data as string);
    if (isEmpty(listStocks)) {
      gridRef.current?.api?.setRowData([]);
      setApiData([]);
    }
    dispatch(UserActions.setUserSettingsWatchlist(newWatchlist));
    debounceFnWatchlist(newWatchlist);
  };

  const handleWsData = useCallback(
    (event: MessageEvent) => {
      if (event?.data && STypeOfWsData(event?.data) === EtypeOfWsData.object) {
        const parseObject = event?.data ? JSON.parse(event?.data) : null;
        if (
          parseObject &&
          parseObject?.systemStatusChangedV2?.status === WS_MESSAGGE_REFRESH_STOCK
        ) {
          fetchApiData();
        }
        if (parseObject && parseObject?.notifySessionByListV2) {
          const { market, session } = parseObject?.notifySessionByListV2;
          const isActiveMarket = market === tableInfo.market;
          if (isActiveMarket && session === EListSessions.ATC) {
            clearMatchedData();
          }
        }
      } else {
        const wsDataArray = event?.data?.split("|");
        if (wsDataArray && Array.isArray(wsDataArray) && Array.isArray(apiData)) {
          const tableInfor =
            typeof tableInfo.data === "string" ? tableInfo.data : "coveredWarrants";
          if (wsDataArray[0].substring(0, 2) === WsDataType.boarding) {
            const data = parseBoardingDataRealtime(wsDataArray);
            const userSettings = getUserSettings();
            const currentPinedRows = getCurrentPinRows(userSettings, tableInfor);
            const pinnedIndex = currentPinedRows.findIndex(el => el === data.id);
            // eslint-disable-next-line @typescript-eslint/no-shadow
            const tableFormat = getTableFormat(userSettings);
            if (tableInfo.tableType === "coveredWarrants") {
              const allData = getAllRow();
              const getDataForUnderlyingAPI = allData.filter(x => x.underlyingSymbol === data.id);
              const changeData = [];
              for (let index = 0; index < getDataForUnderlyingAPI.length; index++) {
                const element = getDataForUnderlyingAPI[index];
                const createData = createDataUnderlying(element, data);
                changeData.push(createData);
              }
              changeData.forEach(element => {
                let rowNode = gridRef.current?.api?.getRowNode(element.stockSymbol);
                if (!rowNode) {
                  return;
                }
                if (tableFormat?.priceTableRealtimeSorting) {
                  gridRef?.current?.api?.applyTransaction({ update: [element] });
                } else {
                  rowNode?.updateData(element);
                }
              });
            }
            let row;
            if (pinnedIndex > -1) {
              row = gridRef?.current?.api?.getPinnedTopRow(pinnedIndex);
            } else {
              row = gridRef.current?.api?.getRowNode(data.id);
            }
            if (!row) return;
            const newData = convertDataBoardingSocket(data, row.data);
            const priceTableRealtimeSorting =
              tableFormat.priceTableRealtimeSorting ?? defaultTableFormat.priceTableRealtimeSorting;
            if (pinnedIndex === -1 && priceTableRealtimeSorting) {
              gridRef?.current?.api?.applyTransaction({ update: [newData] });
            } else {
              row.updateData(newData);
            }
          }
          if (tableInfo.tableType === TableType.derivatives && wsDataArray[0].includes("I#VN30")) {
            const currentPinedRows = gridRef?.current?.api?.pinnedRowModel?.pinnedTopRows?.map(
              item => item?.data
            );
            const wsIndexData = handleConvertSocketChartIndex(wsDataArray);
            if (!wsIndexData.indexValue) {
              return;
            }
            const allData = getAllRow();
            currentPinedRows.forEach((element, index: number) => {
              const rowDerivative = gridRef.current?.api?.getPinnedTopRow(index);
              if (rowDerivative?.id) {
                const newDataDerivatives = {
                  ...rowDerivative?.data,
                  vn30Value: +wsIndexData.indexValue,
                  difference:
                    +wsIndexData.indexValue && rowDerivative?.data?.matchedPrice
                      ? rowDerivative?.data?.matchedPrice - +wsIndexData?.indexValue
                      : rowDerivative?.data?.difference,
                };
                rowDerivative?.updateData(newDataDerivatives);
              }
            });
            const newDataDerivatives = allData.map(item => {
              if (item?.stockSymbol) {
                return {
                  ...item,
                  vn30Value: +wsIndexData.indexValue,
                  difference:
                    item.matchedPrice && +wsIndexData.indexValue
                      ? item.matchedPrice - +wsIndexData.indexValue
                      : null,
                };
              }
            });
            const checkData = newDataDerivatives.filter(x => x?.stockSymbol);
            gridRef.current?.api.applyTransaction({ update: checkData });
          }
        }
      }
    },
    [apiData, tableInfo]
  );

  const fetchApiData = async () => {
    try {
      setIsLoading(true);
      if (tableInfo.tableType === TableType.putThrough) {
        setApiData(null);
        return;
      }
      let resp: AxiosResponse<JsonResponse<StockGroupData[]>> = RESP_DEFAULT_STOCK_GROUP;
      if (typeof tableInfo.data === "string") {
        if (tableInfo.type === "industry") {
          const listCompany = companySectors.find(
            el => el.industryCode === tableInfo.data
          )?.listCompany;
          if (!Array.isArray(listCompany)) return;
          resp = await StockService.getMultiple(listCompany.map(el => el.symbol));
        } else if (tableInfo.type === "exchange") {
          resp = await StockService.getStockExchangeData(tableInfo.data);
        } else if (tableInfo.type === "etf") {
          resp = await StockService.getEtfData();
        } else if (tableInfo.type === TableType.watchlist) {
          const wlActive = watchlist.find(wl => wl._id === tableInfo.data) || null;
          if (wlActive && wlActive.listStocks.length > 0) {
            resp = await StockService.getMultiple(
              wlActive.listStocks,
              StockMultipleSortType.STOCK_INPUT
            );
          }
        } else if (tableInfo.type === "derivative") {
          const queries = {
            hasVN30: ["fu", "vnf"].includes(tableInfo?.data),
            hasVN100: ["fu", "vnf"].includes(tableInfo?.data),
          };
          resp = await StockService.getStockExchangeData(tableInfo.data, queries);
        } else {
          resp = await StockService.getStockGroupData(tableInfo.data);
        }
      } else {
        resp = await StockService.getWarrantData();
      }

      const data: StockGroupData[] =
        typeof tableInfo.data === "string"
          ? !isEmpty(resp.data.data)
            ? resp.data.data
            : []
          : sortDataCW(resp.data?.data);

      if (Array.isArray(data)) {
        setRowData(data);
        setApiData(data);
      }
    } catch (error) {
      setIsLoading(false);
    }
  };

  const setRowData = useCallback(
    async (data: StockGroupData[]) => {
      const tableInfor = typeof tableInfo.data === "string" ? tableInfo.data : "coveredWarrants";
      const movedRows = getMovedRows();
      const userSettings = getUserSettings();
      const currentPinedRows = getCurrentPinRows(userSettings, tableInfor);
      let newData = [];
      data.forEach((el: StockGroupData, idx) => {
        const best1Bid = parseStartEndPriceSession(
          el?.["best1Bid"],
          el?.["best1BidVol"],
          el?.session
        );
        const best1Offer = parseStartEndPriceSession(
          el?.["best1Offer"],
          el?.["best1OfferVol"],
          el?.session
        );
        const best1BidVol = formatVolumeOne(
          { volume: el?.["best1BidVol"], price: el?.["best1Bid"] },
          el?.session
        );
        const best1OfferVol = formatVolumeOne(
          { volume: el?.["best1OfferVol"], price: el?.["best1Offer"] },
          el?.session
        );

        let movedIndex = -1;
        if (movedRows?.[tableInfor as string]) {
          movedIndex = movedRows[tableInfor as string].findIndex(
            symbol => symbol === el.stockSymbol
          );
        }
        const orderIndex = movedIndex > -1 ? movedIndex : idx;
        //derivative
        const difference =
          el?.matchedPrice && +el?.vn30Value ? el?.matchedPrice - +el?.vn30Value : null;
        //covered warrant
        const convertRatio = el?.exerciseRatio?.split(":");
        const breakEvenRender =
          el?.exercisePrice / 1000 +
          (el?.matchedPrice ? el?.matchedPrice / 1000 : el?.refPrice / 1000) *
            (convertRatio ? +convertRatio[0] / +convertRatio[1] : 1);

        newData.push({
          ...el,
          id: el.stockSymbol,
          orderIndex,
          best1Bid,
          best1Offer,
          best1BidVol,
          best1OfferVol,
          priceChange: el?.matchedPrice ? generatePriceChange(el) : null,
          priceChangePercent: el?.matchedPrice ? generatePriceChangePercent(el)?.toFixed(2) : null,
          breakEven: breakEvenRender,
          difference,
        });
      });

      //covered warrant
      if (typeof tableInfo.data !== "string") {
        const listUnderlySymbol = [];

        data.forEach(item => {
          if (listUnderlySymbol.findIndex(x => x === item.underlyingSymbol) === -1) {
            listUnderlySymbol.push(item.underlyingSymbol);
          }
        });
        const dataStockListMultipleBoardRes = await StockService.getMultiple(listUnderlySymbol);
        let dataStockListMultipleBoard = dataStockListMultipleBoardRes?.data?.data;
        setStockListMultipleBoard(dataStockListMultipleBoard);
        for (let index = 0; index < newData?.length; index++) {
          const element: StockGroupData = newData[index];
          const getUnderSymbol: StockGroupData = dataStockListMultipleBoard.find(
            x => x.stockSymbol == element.underlyingSymbol
          );
          if (!getUnderSymbol) return;
          const staticBreakEvenPrice =
            Number(element.breakEven) - getUnderSymbol.matchedPrice / THOUSAND_VND;
          element.underlyingPrice = getUnderSymbol.matchedPrice
            ? getUnderSymbol.matchedPrice
            : getUnderSymbol.refPrice;
          element.breakEvenMarketPrice = staticBreakEvenPrice;
          newData[index] = element;
        }
        newData = filterCoveredWarrant(
          newData,
          tableInfo.data.dateRange[0],
          tableInfo.data.dateRange[1],
          tableInfo.data.symbol,
          tableInfo.data.issuer
        );
        setApiData(newData);
      }

      const pinnedRows = [];
      currentPinedRows.forEach(symbol => {
        const index = newData?.findIndex(x => x.stockSymbol === symbol);
        if (index === -1) return;
        const pinnedData = newData[index];
        pinnedRows.push(pinnedData);
        newData.splice(index, 1);
      });
      newData.sort((a, b) => a.orderIndex - b.orderIndex);
      if (newData.length !== 0 || pinnedRows.length !== 0) {
        newData.push({
          fullWidth: true,
          id: KEY_FOOTER,
          floor: tableFormat.formatVolume,
          refPrice: tableFormat.formatValue,
          tableInfo: tableInfo?.tableType,
        });
      }
      const columnDefs = gridRef.current?.api.getColumnDefs();
      if (columnDefs?.length) {
        const newColumnDefs = handleCreateColumnDefsFitContent(columnDefs, newData);
        if (newColumnDefs?.length) {
          gridRef.current?.api?.setColumnDefs(newColumnDefs);
        }
      }
      gridRef.current?.api?.setPinnedTopRowData(pinnedRows);
      gridRef.current?.api?.setRowData(newData);
      setIsLoading(false);
      if (tableInfo.stock) {
        handleSearchSymbol(tableInfo.stock);
      }
    },
    [tableInfo, tableFormat]
  );

  const handleRefresh = useCallback(async () => {
    const tableInfor = typeof tableInfo.data === "string" ? tableInfo.data : "coveredWarrants";
    const userSettings = getUserSettings();
    const newPriceTablesColumnState = {
      ...userSettings?.priceTablesColumnState,
      [tableInfo.tableType]: DEFAULT_COLUMN_CONFIG[tableInfo.tableType],
    };
    const newUserSettings: Partial<UserSettings> = {
      ...userSettings,
      priceTablesColumnState: newPriceTablesColumnState,
      pinnedRows: {
        ...userSettings?.pinnedRows,
        [tableInfor]: [],
      },
    };
    try {
      await UserService.saveUserSettings({ settings: newUserSettings });
      dispatch(UserActions.setPriceTablesColumnState(newPriceTablesColumnState));
      saveMovedRows({ [tableInfor]: apiData.map(el => el.stockSymbol) });
      getColumnConfig(tableInfo.tableType);
      fetchApiData();
    } catch (error) {}
  }, [tableInfo, apiData, watchlist]);

  const onRowDragEnd = useCallback(() => {
    const tableInfor = typeof tableInfo.data === "string" ? tableInfo.data : "coveredWarrants";
    const { rowsToDisplay } = gridRef.current.api.getModel() || {};
    if (!!rowsToDisplay) {
      // TODO: check if watchlist, call api save
      saveMovedRows({ [tableInfor]: rowsToDisplay.map(row => row.id) });
    }
  }, [tableInfo]);

  // handle move column
  const onDragStopped = useCallback(
    (event: DragStoppedEvent<any>) => {
      if (event.target.className.includes("ag-row-drag")) return; // drag row
      if (event.target.className.includes("ag-header-cell-resize")) return; // resize column
      const userSettings = getUserSettings();
      const isMiniPriceTable = userSettings?.isMiniPriceTable;
      const allColumns = gridRef.current?.columnApi?.getColumnState();
      gridRef.current?.columnApi?.applyColumnState({ defaultState: { pinned: null } });
      const columnState = allColumns.map((item, index) => ({
        colId: item.colId,
        index: item.colId === "pin" ? -1 : index,
        hide: item.hide,
      }));
      if (!isMiniPriceTable) saveColumnState(userSettings, tableInfo.tableType, columnState);
    },
    [tableInfo?.tableType]
  );

  const onGridReady = useCallback(() => {
    setIsReady(true);
    autoResize();
  }, []);

  const isFullWidthRow = useCallback(params => {
    return params.rowNode?.data?.fullWidth;
  }, []);

  const handleChangeTableFormat = useCallback(
    (format: PriceTablesFormat) => {
      const newData = {
        fullWidth: true,
        id: KEY_FOOTER,
        floor: format.formatVolume,
        refPrice: format.formatValue,
        pin: true,
        tableInfo: tableInfo?.tableType,
      };
      gridRef.current?.api?.applyTransactionAsync({ update: [newData] });
    },
    [tableInfo]
  );

  const handleChangeColumnState = useCallback(
    (tableType: TableType) => {
      if (tableInfo.tableType === tableType) {
        getColumnConfig(tableType);
      }
    },
    [tableInfo]
  );

  const clearMatchedData = useCallback(() => {
    const { rowsToDisplay } = gridRef.current.api.getModel() || {};
    const pinnedRows = gridRef.current?.api?.pinnedRowModel?.pinnedTopRows;
    const clearedData = {
      matchedPrice: 0,
      matchedVolume: 0,
      priceChange: null,
      priceChangePercent: null,
    };
    if (Array.isArray(rowsToDisplay)) {
      gridRef.current?.api?.setRowData(
        rowsToDisplay.map(el => ({
          ...el.data,
          ...clearedData,
        }))
      );
    }
    if (Array.isArray(pinnedRows)) {
      gridRef.current?.api?.setPinnedTopRowData(
        pinnedRows.map(el => ({
          ...el.data,
          ...clearedData,
        }))
      );
    }
  }, []);

  const handleSearchSymbol = useCallback((stockSymbol: string) => {
    setTimeout(() => {
      const pinnedRows = gridRef.current?.api?.pinnedRowModel?.pinnedTopRows;
      const rowNode = gridRef.current?.api?.getRowNode(stockSymbol);
      const pinnedRow = pinnedRows?.find(row => row.data.stockSymbol === stockSymbol);
      const pinnedIndex = pinnedRows?.findIndex(row => row.data.stockSymbol === stockSymbol);
      gridRef.current?.api?.ensureNodeVisible(pinnedRow ?? rowNode, "top");
      if (pinnedRow || rowNode) {
        document.querySelectorAll(".table-grid .scrolled-row").forEach(el => {
          el.classList.remove("scrolled-row");
        });

        if (rowNode) {
          Array.from(document.querySelectorAll(`.table-grid div[row-id=${stockSymbol}]`)).forEach(
            el => {
              el.classList.add("scrolled-row");
            }
          );
        } else {
          setTimeout(
            () =>
              Array.from(
                document.querySelectorAll(`.table-grid div[row-index=t-${pinnedIndex}]`)
              ).forEach(el => {
                el.classList.add("scrolled-row");
              }),
            100
          );
        }
      }
    });
  }, []);

  const getAllRow = useCallback(() => {
    let rowData = [];
    gridRef.current?.api?.forEachNode(gridNode => rowData.push(gridNode.data));
    return rowData;
  }, []);

  const handleAddStockWatchlist = async (stock: string): Promise<void> => {
    const wlActive: Watchlist = watchlist.find(wl => wl._id === tableInfo?.data) || null;
    const rowNode = gridRef.current?.api?.getRowNode(stock);
    const rows = getAllRow().filter(row => row.id !== KEY_FOOTER);

    if (wlActive && !isEmpty(stock)) {
      if (rows.length >= maxExchangeWatchlist) {
        UseToastSSI({
          message: t("Watchlist:MaxAddStockWatchlist"),
          options: {
            type: EToastTypes.error,
          },
        });
        return;
      }
      if (rowNode) {
        UseToastSSI({
          message: t("Watchlist:StockSymbolAlreadyExist", {
            stockSymbol: stock,
            watchlist: wlActive.name,
          }),
          options: {
            type: EToastTypes.warning,
          },
        });
        return;
      }
      await addStockPriceBoard(stock);

      handleSaveStock(stock);
    }
  };

  const addStockPriceBoard = async (stock: string) => {
    const rows = getAllRow();
    try {
      if (!stock) {
        return;
      }
      const resp = await StockService.getStockData(stock);
      const data = resp.data?.data;
      if (!data) {
        return;
      }
      const newData: any[] = [{ ...data, id: data.stockSymbol }];
      if (rows.length === 0) {
        newData.push({
          fullWidth: true,
          id: KEY_FOOTER,
          floor: tableFormat.formatVolume,
          refPrice: tableFormat.formatValue,
          tableInfo: tableInfo?.tableType,
        });
      }
      setApiData([...apiData, data]);
      gridRef.current?.api.applyTransactionAsync({
        add: newData,
        addIndex: rows.length + 1,
      });
    } catch (error) {}
  };

  const addToListStocks = (nStock: string): Watchlist[] => {
    const rows = getAllRow()
      .filter(row => row.id !== KEY_FOOTER)
      .map(row => row.stockSymbol);
    const listStocks = [...rows, nStock];
    const watchlists = watchlist.map(wl => {
      if (wl._id === tableInfo.data) {
        return { ...wl, listStocks: listStocks };
      }

      return wl;
    });

    return watchlists;
  };

  const handleSaveStock = async (nStock: string) => {
    try {
      const watchlists = addToListStocks(nStock);
      const userSettings = getUserSettings();
      try {
        await saveWatchlist(userSettings, watchlists);
        dispatch(UserActions.setUserSettingsWatchlist(watchlists));
        UseToastSSI({
          message: t("Watchlist:AddStockSymbolSuccessful", {
            stockSymbol: nStock,
            watchlist: tableInfo.subTab,
          }),
          options: {
            type: EToastTypes.success,
          },
        });
      } catch (error) {}
    } catch (error) {}
  };

  const autoResize = () => {
    if (gridRef.current) {
      gridRef.current.api?.sizeColumnsToFit();
    }
  };

  useEffect(() => {
    window.addEventListener("resize", autoResize);
    return () => {
      window.removeEventListener("resize", autoResize);
    };
  }, []);

  return (
    <PriceBoardContextProvider>
      <div className="flex flex-col h-full p-2 price-board min-h-64" id={node.getId()}>
        <div className="pb-2">
          <Leading
            handleRefresh={handleRefresh}
            gridRef={gridRef}
            setTableInfo={setTableInfo}
            tableInfo={tableInfo}
            handleChangeColumnState={handleChangeColumnState}
            handleSearchSymbol={(stock: string) => {
              handleSearchSymbol(stock);
              handleAddStockWatchlist(stock);
            }}
            listSymbol={listSymbol}
            gridPutThrough={[gridAsks, gridMatched, gridBids]}
            totalTradingVolume={totalTradVolume}
            totalTradingPrice={totalTradPrice}
          />
        </div>
        {tableInfo?.tableType === "putThrough" ? (
          <PutThrough
            exchange={tableInfo.data}
            node={node}
            gridBids={gridBids}
            gridAsks={gridAsks}
            gridMatched={gridMatched}
            handleSetTotalTradingVolume={setTotalTradingVolume}
            handleSetTotalTradingPrice={setTotalTradingPrice}
            totalTradingVolume={totalTradVolume}
            totalTradingPrice={totalTradPrice}
          />
        ) : (
          <div className="relative w-full h-full">
            <LoadingInContent loading={isLoading} />
            <AgTable
              node={node}
              gridRef={gridRef}
              isWatchlist={!isEmpty(tableInfo) && tableInfo.type === TableType.watchlist}
              getRowId={getRowId}
              defaultColDef={defaultColDef}
              onRowDragEnd={onRowDragEnd}
              onDragStopped={onDragStopped}
              onGridReady={onGridReady}
              fullWidthCellRenderer={Footer}
              isFullWidthRow={isFullWidthRow}
              postSortRows={postSortRows}
              suppressNoRowsOverlay={suppressNoRowsOverlay}
            />
          </div>
        )}
      </div>
    </PriceBoardContextProvider>
  );
});
