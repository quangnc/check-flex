import { TableType } from "constants/price-board";
import { getDefaultColumnDefs } from "./default-column.define";
import { getQuitiesColumnDefs } from "./equities-column.define";
import { columnWarrantDef } from "./covered-warrant-column.define";
import { IWarrantFormData } from "../leading/menu-list";
import { commonColumn } from "./common-column.define";
import { columnWatchlistDef } from "./watchlist-column.define";
import { columnDerivativesDef } from "./derivatives-column.define";

export const columnConfig = (
  type: TableType,
  gridRef: any,
  group: string | IWarrantFormData,
  preDay?: number,
  handleRemoveStock?: (stock: string) => void
) => {
  switch (type) {
    case TableType.equities:
      return [
        ...getDefaultColumnDefs({ gridRef, group, preDay }),
        ...commonColumn,
        ...getQuitiesColumnDefs(),
      ];
    case TableType.coveredWarrants:
      return [
        ...getDefaultColumnDefs({ gridRef, group, isCoveredWarrant: true, preDay }),
        ...commonColumn,
        ...columnWarrantDef,
      ];
    case TableType.watchlist:
      return [
        ...getDefaultColumnDefs({
          gridRef,
          group,
          isMoreAction: false,
          isRemoveStock: true,
          preDay,
          handleRemoveStock: handleRemoveStock,
        }),
        ...commonColumn,
        ...columnWatchlistDef,
      ];
    case TableType.derivatives:
      return [
        ...getDefaultColumnDefs({ gridRef, group, preDay }),
        ...commonColumn,
        ...columnDerivativesDef,
      ];

    default:
      return [];
  }
};
