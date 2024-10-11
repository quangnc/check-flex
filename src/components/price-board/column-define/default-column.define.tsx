import CellRender, { PinRenderer } from "../cell/cell-render.component";
import CustomerHeader from "../cell/custom-header";
import { ColDef } from "ag-grid-community";
import { createClassRenderToolTip, createColorRender } from "util/convert-class.util";
import {
  checkDisplayIconUpcompingEvent,
  customComparator,
  customEquals,
  getIndexOfPinTable,
} from "util/price-board/config-column";
import { pinRows, removePinnedRows } from "util/price-board/pin-rows";
import { getUserSettings } from "util/price-board/user-settings";
import CustomTooltip from "../tooltip";

export const HeaderComponent = ({ displayName }) => {
  return <p className="text-xs font-normal text-header-cell">{displayName}</p>;
};

export const getDefaultColumnDefs = ({
  gridRef,
  group,
  preDay,
  isMoreAction = true,
  isRemoveStock = false,
  isCoveredWarrant = false,
  handleRemoveStock = null,
}) => {
  const handleRemoveRowByStock = params => {
    handleRemoveStock(params?.data?.stockSymbol ?? "");
    gridRef.current?.api.applyTransactionAsync({ remove: [params.data] });
    removeStockPin(params);
  };

  const removeStockPin = params => {
    const userSettings = getUserSettings();
    let pinnedRowsData = params?.api.pinnedRowModel.pinnedTopRows.map(item => item?.data);
    if (pinnedRowsData?.findIndex(item => item?.stockSymbol === params?.data?.stockSymbol) > -1) {
      pinnedRowsData = pinnedRowsData.filter(el => el?.stockSymbol !== params?.data?.stockSymbol);
      removePinnedRows(userSettings, group, params?.data?.stockSymbol);
      gridRef.current?.api.setPinnedTopRowData(pinnedRowsData);
    }
  };

  return [
    {
      field: "pin",
      headerName: "",
      minWidth: 28,
      maxWidth: 28,
      pinned: "left",
      lockPinned: true,
      lockPosition: "left",
      rowDrag: true,
      cellClass: "cell-pin",
      resizable: false,
      tooltipField: "ceiling",
      sortable: false,
      tooltipComponent: CustomTooltip,
      onCellDoubleClicked: params => {
        const userSettings = getUserSettings();
        // @ts-ignore
        let pinnedRowsData = params?.api.pinnedRowModel.pinnedTopRows.map(item => item?.data);
        if (
          pinnedRowsData?.findIndex(item => item?.stockSymbol === params?.data?.stockSymbol) > -1
        ) {
          pinnedRowsData = pinnedRowsData.filter(
            el => el?.stockSymbol !== params?.data?.stockSymbol
          );
          const indexOfTable = getIndexOfPinTable([...pinnedRowsData, params.data], params.data);
          removePinnedRows(userSettings, group, params?.data?.stockSymbol);
          gridRef.current?.api.applyTransactionAsync({
            add: [params.data],
            addIndex: indexOfTable,
          });
        } else {
          pinnedRowsData = [...pinnedRowsData, params?.data];
          pinRows(userSettings, group, params?.data?.stockSymbol);
          gridRef.current?.api.applyTransactionAsync({ remove: [params.data] });
        }
        gridRef.current?.api.setPinnedTopRowData(pinnedRowsData);
      },
      cellRenderer: params => <PinRenderer params={params} />,
    },
    {
      field: "stockSymbol",
      headerName: "PriceBoard:Header:Symbol",
      headerComponent: CustomerHeader,
      minWidth: 85,
      headerClass: "header-id-stock header-start",
      pinned: "left",
      lockPinned: true,
      lockPosition: "left",
      equals: customEquals,
      valueGetter: api => {
        return {
          value: api.data.stockSymbol,
          price: api.data.matchedPrice,
          ceiling: api.data.ceiling,
          floor: api.data.floor,
          refPrice: api.data.refPrice,
        };
      },
      comparator: customComparator,
      cellRenderer: params => {
        const color = createColorRender(
          params.data.ceiling,
          params.data.floor,
          params.data.refPrice,
          params.data.matchedPrice
        );
        const bg = createClassRenderToolTip(
          params.data.ceiling,
          params.data.floor,
          params.data.refPrice,
          params.data.matchedPrice
        );
        let extraData: string | React.ReactElement = "";
        if (params.data.caStatus) {
          extraData = " *";
        } else if (
          Array.isArray(params.data.corporateEvents) &&
          params.data.corporateEvents.length > 0
        ) {
          extraData = (
            <div className={`${bg} w-[0.3125rem] h-[0.3125rem] rounded-full ml-0.5 mt-0.5`}></div>
          );
        }

        const isDisplayExtraData = checkDisplayIconUpcompingEvent(params, preDay);

        return (
          <CellRender
            params={params}
            isMoreAction={isMoreAction}
            isRemoveStock={isRemoveStock}
            classNameMore={`justify-start px-1 ${color}`}
            extraData={isDisplayExtraData ? extraData : ""}
            isCoveredWarrant={isCoveredWarrant}
            handleRemoveRowByStock={handleRemoveRowByStock}
          />
        );
      },
    },
  ] as ColDef<any>[];
};
