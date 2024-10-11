import { ColDef } from "ag-grid-community";
import { useTranslation } from "react-i18next";

import CustomerHeader from "../cell/custom-header";
import { formatDataDisplayBoarding } from "util/format-data.util";
import CellRender, { CellRenderStatic } from "../cell/cell-render.component";

type HeaderComponentProps = {
  displayName: string;
  className?: string;
};

export const HeaderComponent = ({
  displayName,
  className = "whitespace-nowrap text-ellipsis",
  ...props
}: HeaderComponentProps) => {
  const { t } = useTranslation();
  return (
    <p className={`overflow-hidden text-xs font-normal text-header-cell ${className}`}>
      {t(displayName)}
    </p>
  );
};
// whitespace-nowrap
// flex items-center h-full text-xs font-normal text-center cursor-pointer text-header-cell
export const getQuitiesColumnDefs = () => {
  return [
    {
      field: "caStatus",
      headerName: "PriceBoard:Header:CAStatus",
      headerClass: "header-end",
      headerComponent: CustomerHeader,
      minWidth: 60,
      hide: true,
      cellRenderer: params => {
        return (
          <CellRenderStatic
            data={params.value && params.value.length > 0 ? params.value : ""}
            className="text-light dark:text-white"
          />
        );
      },
    },
    {
      field: "tradingStatus",
      headerName: "PriceBoard:Header:TradingStatus",
      headerClass: "header-end",
      headerComponent: CustomerHeader,
      minWidth: 60,
      hide: true,
      cellRenderer: params => {
        return (
          <CellRenderStatic
            data={params.value && params.value.length > 0 ? params.value : ""}
            className="text-light dark:text-white"
          />
        );
      },
    },
    {
      field: "avgPrice",
      headerName: "PriceBoard:Header:Average",
      headerClass: "header-end",
      headerComponent: CustomerHeader,
      hide: true,
      minWidth: 70,
      cellRenderer: params => {
        return (
          <CellRender
            params={params}
            value={formatDataDisplayBoarding(params?.value)}
            classNameMore="column-highlight"
          />
        );
      },
    },
    {
      field: "currentBidQty",
      minWidth: 48,
      headerName: "PriceBoard:Header:TotalBid",
      headerClass: "header-end",
      headerComponent: CustomerHeader,
      hide: true,
      cellRenderer: params => {
        return (
          <CellRender
            params={params}
            isBasic={true}
            value={params.value ? params.value.toLocaleString("en-US") : ""}
          />
        );
      },
    },
    {
      field: "currentOfferQty",
      minWidth: 48,
      headerName: "PriceBoard:Header:TotalAsk",
      headerClass: "header-end",
      headerComponent: CustomerHeader,
      hide: true,
      cellRenderer: params => {
        return (
          <CellRender
            params={params}
            isBasic={true}
            value={params.value ? params.value.toLocaleString("en-US") : ""}
          />
        );
      },
    },
    {
      headerName: "PriceBoard:Header:Foreign",
      headerClass: "header-end",
      headerComponent: CustomerHeader,
      headerGroupComponent: HeaderComponent,
      children: [
        {
          field: "buyForeignQtty",
          headerName: "PriceBoard:Header:NNFbuy",
          headerClass: "header-end",
          headerComponent: CustomerHeader,
          minWidth: 70,
          cellRenderer: params => {
            return (
              <CellRender
                params={params}
                isBasic={true}
                value={params.value ? params.value.toLocaleString("en-US") : ""}
              />
            );
          },
        },
        {
          field: "buyForeignValue",
          headerName: "PriceBoard:Header:FbuyVal",
          headerClass: "header-end",
          headerComponent: CustomerHeader,
          minWidth: 80,
          hide: true,
          cellRenderer: params => {
            return (
              <CellRender
                params={params}
                isBasic={true}
                value={params.value ? params.value.toLocaleString("en-US") : ""}
              />
            );
          },
        },
        {
          field: "sellForeignQtty",
          headerName: "PriceBoard:Header:NNFsell",
          headerClass: "header-end",
          headerComponent: CustomerHeader,
          minWidth: 70,
          cellRenderer: params => {
            return (
              <CellRender
                params={params}
                isBasic={true}
                value={params.value ? params.value.toLocaleString("en-US") : ""}
              />
            );
          },
        },
        {
          field: "sellForeignValue",
          headerName: "PriceBoard:Header:FsellVal",
          headerClass: "header-end",
          headerComponent: CustomerHeader,
          minWidth: 80,
          hide: true,
          cellRenderer: params => {
            return (
              <CellRender
                params={params}
                isBasic={true}
                value={params.value ? params.value.toLocaleString("en-US") : ""}
              />
            );
          },
        },
        {
          field: "remainForeignQtty",
          headerName: "Room",
          headerClass: "header-end",
          headerComponent: CustomerHeader,
          minWidth: 90,
          cellRenderer: params => {
            return (
              <CellRender
                params={params}
                isBasic={true}
                value={params.value ? params.value.toLocaleString("en-US") : ""}
              />
            );
          },
        },
      ],
    },
  ] as ColDef<any>[];
};
