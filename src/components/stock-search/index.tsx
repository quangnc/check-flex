import { AutoComplete, Select, Spin } from "antd";
import cx from "classnames";
import { LocalStorageKeysConstant } from "constants/";
import { KeyBoard, SYMBOL_SEARCH_ERROR } from "constants/common";
import { EStockType } from "constants/stock";
import { usePriceBoardContext } from "contexts/price-board";
import { SearchIcon } from "Icons/IconSearch";
import _, { throttle } from "lodash";
import React, { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { StockService } from "services/stock.service";
import { IStockSearch, IStockSearchPaging, TSearchStockBySymbol } from "types";
import { LocalStorage } from "util/local-storage";
import styles from "./styles.module.scss";

const ORDER_TYPE_INDEX = { s: 1, i: 2, w: 3, f: 4, e: 5, m: 6, b: 7 };

export enum ESearchFiltered {
  ALL = "all",
  PRICE_BOARD = "priceBoard",
  EQUITY_ORDER = "equityOrder",
  CORPORATE_INFO = "corporateInformation",
  COVERED_WARRANTS = "coveredWarrants",
  TIME_AND_SALES = "timeAndSales",
  DERIVATIVES_ORDER = "derivativesOrder",
}

export enum WidgetLists {
  PORTFOLIO = "PORTFOLIO",
}

const WidgetList = Object.values(WidgetLists);

interface IStockSearchProps {
  value?: string;
  handleSelect: (selected: IStockSearch) => void;
  watchlistActivated?: boolean;
  searchValueFilteredBy: ESearchFiltered;
  placeholder?: string;
  isAutocomplete?: boolean;
  currentFocus?: number;
  setCurrentFocus?: Dispatch<SetStateAction<number>>;
  focusIndex?: number;
  onKeyDown?: (e: any) => void;
  selectTextOnFocus?: boolean;
  propsOnChange?: (text) => void;
  setError?: (value: string) => void;
  typeSearch?: EStockType[];
  widgetName?: WidgetLists;
}

export default React.memo(function StockSearch(props: IStockSearchProps) {
  const {
    value: propsValue = null,
    handleSelect: propHandleSelect,
    watchlistActivated = false,
    searchValueFilteredBy: propsSearchValueFilteredBy,
    placeholder: propPlaceHolder = null,
    isAutocomplete = false,
    currentFocus,
    setCurrentFocus,
    focusIndex,
    onKeyDown,
    selectTextOnFocus,
    propsOnChange,
    setError,
    widgetName,
    typeSearch = null,
    ...otherProps
  } = props;
  const { t, i18n } = useTranslation();
  const defaultPaging = React.useRef<IStockSearchPaging>({
    page: 1,
    pageSize: 20,
    totalRecords: null,
  }).current;
  const [isLoading, setIsLoading] = React.useState(false);
  const [symbol, setSymbol] = React.useState("");
  const [options, setOptions] = React.useState<IStockSearch[]>([]);
  const [paging, setPaging] = React.useState<IStockSearchPaging>(defaultPaging);
  const [lazyLoad, setLazyLoad] = React.useState<boolean>(false);
  const selectRef = React.useRef(null);
  const { shouldSearchInputFocus } = usePriceBoardContext();
  const selected = useRef<boolean>(false);
  const isGetValueInput = widgetName && WidgetList.includes(widgetName);

  const highlightCharacter = React.useCallback(
    (text: string) => {
      const isHighlight = (char: string) => symbol.toUpperCase().includes(char.toUpperCase());
      return text?.split("").map((c, i) => (
        <span key={i} className={isHighlight(c) ? "text-red-600" : ""}>
          {c}
        </span>
      ));
    },
    [symbol]
  );

  const filterSearchResult = React.useCallback(
    (searchResult: IStockSearch[] = []) => {
      const filterConditions = {
        [ESearchFiltered.PRICE_BOARD]: (item: IStockSearch) => item.stockType !== EStockType.index,
        [ESearchFiltered.EQUITY_ORDER]: (item: IStockSearch) =>
          item.stockType !== EStockType.index && item.stockType !== EStockType.derivatives,
        [ESearchFiltered.COVERED_WARRANTS]: (item: IStockSearch) =>
          item.stockType !== EStockType.coveredWarrants,
        [ESearchFiltered.TIME_AND_SALES]: (item: IStockSearch) =>
          ![EStockType.index].includes(item.stockType),
        [ESearchFiltered.CORPORATE_INFO]: (item: IStockSearch) =>
          ![EStockType.stock, EStockType.etf, EStockType.mutaFund].includes(item.stockType),
        [ESearchFiltered.DERIVATIVES_ORDER]: (item: IStockSearch) =>
          item.stockType === EStockType.derivatives && (!item?.symbol_ref ?? !item?.symbolRef),
      };

      return searchResult?.filter(item => {
        const filterCondition = filterConditions[propsSearchValueFilteredBy];
        return filterCondition ? filterCondition(item) : true;
      });
    },
    [propsSearchValueFilteredBy]
  );

  const getAllStocksThrottle = React.useCallback(throttle(getAllStocks, 2000), [getAllStocks]);

  const getOptionsFromStorage = (stockOptions, query) => {
    const newVal = query.trim().toUpperCase();
    const optionsData = filterSearchResult(stockOptions)
      .filter(item => {
        const clientName = i18n.language === "en" ? item?.clientNameEn : item?.clientName;
        return (
          item?.symbol?.toLowerCase().includes(query) || clientName?.toLowerCase().includes(query)
        );
      })
      .sort(
        (stockA, stockB) => ORDER_TYPE_INDEX[stockA.stockType] - ORDER_TYPE_INDEX[stockB.stockType]
      )
      .sort((a: any, b: any) => {
        const indexA = a?.symbol?.toLowerCase()?.indexOf(query);
        const indexB = b?.symbol?.toLowerCase()?.indexOf(query);
        // Nếu một trong hai không chứa chuỗi tìm kiếm, đặt nó xuống cuối
        if (indexA === -1 && indexB !== -1) return 1;
        if (indexB === -1 && indexA !== -1) return -1;

        // Nếu cả hai đều không chứa, so sánh toàn bộ chuỗi
        if (indexA === -1 && indexB === -1) {
          return a.name.localeCompare(b.name);
        }

        // Nếu cả hai đều chứa, so sánh vị trí xuất hiện
        if (indexA !== indexB) {
          return indexA - indexB;
        }

        // Nếu vị trí xuất hiện bằng nhau, so sánh toàn bộ chuỗi
        return a.name.localeCompare(b.name);
      });
    if (setError) {
      const foundedFromInput = optionsData.findIndex(e => e.symbol === newVal);
      setError(foundedFromInput === -1 ? SYMBOL_SEARCH_ERROR : "");
    }
    setOptions(optionsData);
  };

  const getOptionsBySymbol = async value => {
    const newVal = value.trim().toUpperCase();
    setPaging(defaultPaging);
    setIsLoading(true);
    try {
      const params: TSearchStockBySymbol = {
        query: value,
        page: defaultPaging.page,
        pageSize: defaultPaging.pageSize,
      };

      if (props?.typeSearch) {
        params.types = props?.typeSearch;
      }
      const response = await StockService.searchStockBySymbol(params);
      const responseData = filterSearchResult(response.data.data).filter(
        ({ symbolRef, stockType }) => !(symbolRef && stockType === EStockType.derivatives)
      );
      if (setError) {
        const foundedFromInput = responseData.findIndex(e => e.symbol === newVal);
        setError(foundedFromInput === -1 ? SYMBOL_SEARCH_ERROR : "");
      }
      setOptions(responseData);
      setPaging(response?.data?.paging);
    } catch (error: any) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = React.useMemo(() => {
    const loadOptions = async (value: string) => {
      setOptions([]);
      if (_.isNil(value.trim()) || value.includes(" ")) {
        return;
      }
      if (!value) {
        propHandleSelect({ symbol: "" } as IStockSearch);
        return;
      }
      const query = value?.toLowerCase();

      setSymbol(query);
      const stocksStorage = LocalStorage.getItem(LocalStorageKeysConstant.ALL_STOCKS);
      const stockOptions = stocksStorage?.length > 0 ? JSON.parse(stocksStorage) : [];
      if (stockOptions.length > 0) {
        setLazyLoad(false);
        getOptionsFromStorage(stockOptions, query);
      } else {
        setLazyLoad(true);
        getOptionsBySymbol(value);
        getAllStocksThrottle();
      }
    };

    return loadOptions;
  }, [propHandleSelect]);

  const handleScroll = React.useCallback(
    async (e: any) => {
      const target = e.target;
      const isBottom = target.scrollTop + target.offsetHeight === target.scrollHeight;

      if (
        !isLoading &&
        isBottom &&
        paging.page * paging.pageSize < paging.totalRecords &&
        lazyLoad
      ) {
        try {
          setIsLoading(true);
          const params = {
            query: symbol,
            page: paging.page + 1,
            pageSize: paging.pageSize,
          };
          const response = await StockService.searchStockBySymbol(params);
          const responseData = filterSearchResult(response?.data?.data);
          setOptions([...options, ...responseData]);
          setPaging(response?.data?.paging);
        } catch (error: any) {
        } finally {
          setIsLoading(false);
        }
      }
    },
    [paging, isLoading, symbol]
  );

  const handleSelect = (_value, option) => {
    if (setError) {
      setError("");
    }
    selected.current = true;
    propHandleSelect(option);
  };

  const handlePlaceholder = (isWatchlistActivated: boolean) => {
    if (!isWatchlistActivated)
      return propPlaceHolder ? propPlaceHolder : t("PriceBoardMenu:Stock Symbol");
    return t("PriceBoardMenu:WatchlistPlaceholder");
  };

  useEffect(() => {
    if ((currentFocus && currentFocus === focusIndex) || shouldSearchInputFocus) {
      selectRef.current?.focus();
    }
  }, [currentFocus, focusIndex, shouldSearchInputFocus]);

  useEffect(() => {
    if (propsOnChange) {
      propsOnChange(propsValue);
    }
  }, [propsValue]);

  return (
    <>
      {isAutocomplete ? (
        <AutoComplete
          className={styles["stock-search"]}
          popupClassName={styles["popup-input-search"]}
          value={propsValue}
          placeholder={propPlaceHolder ? propPlaceHolder : t("PriceBoardMenu:Stock Symbol")}
          defaultActiveFirstOption={true}
          filterOption={false}
          notFoundContent={isLoading ? <Spin className="flex justify-center" size="small" /> : null}
          options={options.map(item => ({
            ...item,
            ...{
              value: item.symbol,
            },
          }))}
          optionRender={option => (
            <div className="flex items-center gap-2">
              <div className="w-20 truncate">{highlightCharacter(option.data.symbol)}</div>
              <div className="flex-1 truncate">
                {highlightCharacter(
                  i18n.language === "en" ? option.data.clientNameEn : option.data.clientName
                )}
              </div>
              <div className="w-40 text-right truncate text-secondary-color">
                {`${
                  option.data.stockType
                    ? `${t(`PriceBoardMenu:StockType:${option.data.stockType}`)} - `
                    : ""
                }${option.data.exchange || ""}`}
              </div>
            </div>
          )}
          onDropdownVisibleChange={open => {
            if (!open) {
              if (options.length > 0 && !selected.current && !watchlistActivated) {
                propHandleSelect(options[0]);
                if (setError) setError("");
              }
              selected.current = false;
              setOptions([]);
            }
          }}
          onSelect={handleSelect}
          onPopupScroll={handleScroll}
          suffixIcon={<SearchIcon className="w-4.5 h-4.5 text-dark-300 dark:text-white-200" />}
          onSearch={handleSearch}
          ref={selectRef}
          onKeyDown={e => {
            if (onKeyDown) onKeyDown(e);
            if (
              (e.key === KeyBoard.Enter || e.key === KeyBoard.Tab) &&
              isGetValueInput &&
              options.length === 0 &&
              propsValue
            ) {
              propHandleSelect({ symbol: propsValue?.toUpperCase() });
            }
          }}
          onFocus={e => {
            if (setCurrentFocus) setCurrentFocus(focusIndex);
            if (selectTextOnFocus) (e.target as any).select();
          }}
          onBlur={() => {
            if (setCurrentFocus) setCurrentFocus(null);
            if (isGetValueInput && options.length === 0 && propsValue) {
              propHandleSelect({ symbol: propsValue?.toUpperCase() });
            }
          }}
          onChange={propsOnChange}
          tabIndex={-1}
          {...otherProps}
        />
      ) : (
        <Select
          autoFocus
          className={styles["stock-search"]}
          popupClassName={cx(styles["popup-input-search"], {
            "p-0 shadow-none": _.isEmpty(options) || _.isEmpty(symbol),
          })}
          showSearch
          value={propsValue}
          placeholder={handlePlaceholder(watchlistActivated)}
          defaultActiveFirstOption={true}
          suffixIcon={<SearchIcon className="w-4.5 h-4.5 text-dark-300 dark:text-white-200" />}
          filterOption={false}
          notFoundContent={isLoading ? <Spin className="flex justify-center" size="small" /> : null}
          options={
            !_.isEmpty(symbol) &&
            options?.map(item => ({
              ...item,
              ...{
                value: item.symbol,
              },
            }))
          }
          optionRender={option => (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="w-20 truncate">{highlightCharacter(option.data.symbol)}</div>
              <div className="flex-1 truncate">
                {highlightCharacter(
                  i18n.language === "en" ? option.data.clientNameEn : option.data.clientName
                )}
              </div>
              <div className="w-40 text-right truncate text-secondary-color">
                {`${
                  option.data.stockType
                    ? `${t(`PriceBoardMenu:StockType:${option.data.stockType}`)} - `
                    : ""
                }${option.data.exchange || ""}`}
              </div>
            </div>
          )}
          listHeight={320}
          onSearch={handleSearch}
          onPopupScroll={handleScroll}
          onDropdownVisibleChange={() => {
            if (options.length > 0 && !selected.current && !watchlistActivated) {
              propHandleSelect(options[0]);
            }
            selected.current = false;
            setOptions([]);
          }}
          onSelect={handleSelect}
          ref={selectRef}
          {...otherProps}
        />
      )}
    </>
  );
});

export const getAllStocks = async () => {
  try {
    const responseStocks = await StockService.getAllStock();
    if (!responseStocks?.data?.data) {
      return;
    }
    const allStocks = responseStocks?.data?.data;
    const allStocksConvert: IStockSearch[] = allStocks.map(stock => ({
      ...stock,
      symbol: stock.code,
      stockType: stock.type,
      fullName: stock.full_name,
    }));

    LocalStorage.setItem(LocalStorageKeysConstant.ALL_STOCKS, JSON.stringify(allStocksConvert));
  } catch (err) {
    LocalStorage.setItem(LocalStorageKeysConstant.ALL_STOCKS, []);
  }
};

export const getLatestExpiringStock = async (stocks: IStockSearch[]) => {
  const symbols = stocks?.map(i => i.symbol) ?? [];
  try {
    const response = await StockService.getMultiple(symbols);
    const data = response?.data?.data
      ?.filter(item => item?.maturityDate)
      ?.map(item => ({
        stockSymbol: item?.stockSymbol,
        stockType: item?.stockType,
        exchange: item?.exchange,
        maturityDate: item?.maturityDate,
      }))
      ?.sort((a, b) => {
        if (a.exchange === "vnf" && b.exchange !== "vnf") {
          return -1;
        } else if (a.exchange !== "vnf" && b.exchange === "vnf") {
          return 1;
        } else {
          const dateA = new Date(a.maturityDate);
          const dateB = new Date(b.maturityDate);
          return dateA.getTime() - dateB.getTime();
        }
      });
    return data?.[0] ?? null;
  } catch (error) {
    return null;
  }
};
