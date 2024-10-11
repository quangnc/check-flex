import { formatDataDisplayBoarding } from "util/format-data.util";
import CellRender, { CellRenderSession, CellRenderStatic } from "../cell/cell-render.component";
import CustomerHeader from "../cell/custom-header";
import { HeaderComponent } from "./equities-column.define";

export const columnWatchlistDef = [
  {
    field: "exchange",
    headerName: "PriceBoard:Header:Exchange",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    minWidth: 59,
    cellRenderer: params => (
      <CellRenderStatic
        className="justify-start pl-1 text-basic"
        data={params.value?.toUpperCase()}
      />
    ),
  },
  {
    field: "session",
    headerName: "PriceBoard:Header:Session",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    minWidth: 65,
    cellRenderer: ({ data }) => <CellRenderSession data={data} />,
  },
  {
    field: "openInterest",
    headerName: "PriceBoard:Header:OI",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    minWidth: 49,
    cellRenderer: params => (
      <CellRenderStatic data={params.value ?? ""} className="text-light dark:text-white" />
    ),
  },
  {
    field: "caStatus",
    headerName: "PriceBoard:Header:CAStatus",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    minWidth: 60,
    hide: true,
    cellRenderer: params => (
      <CellRenderStatic
        data={params.value && params.value.length > 0 ? params.value : ""}
        className="text-light dark:text-white"
      />
    ),
  },
  {
    field: "tradingStatus",
    headerName: "PriceBoard:Header:TradingStatus",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    minWidth: 60,
    hide: true,
    cellRenderer: params => (
      <CellRenderStatic
        data={params.value && params.value.length > 0 ? params.value : ""}
        className="text-light dark:text-white"
      />
    ),
  },
  {
    field: "avgPrice",
    headerName: "PriceBoard:Header:Average",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    hide: true,
    minWidth: 70,
    cellRenderer: params => (
      <CellRender
        params={params}
        value={formatDataDisplayBoarding(params?.value)}
        classNameMore="column-highlight"
      />
    ),
  },
  {
    field: "currentBidQty",
    minWidth: 48,
    headerName: "PriceBoard:Header:TotalBid",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    hide: true,
    cellRenderer: params => (
      <CellRender
        params={params}
        isBasic={true}
        value={params.value ? params.value.toLocaleString("en-US") : ""}
      />
    ),
  },
  {
    field: "currentOfferQty",
    minWidth: 48,
    headerName: "PriceBoard:Header:TotalAsk",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    hide: true,
    cellRenderer: params => (
      <CellRender
        params={params}
        isBasic={true}
        value={params.value ? params.value.toLocaleString("en-US") : ""}
      />
    ),
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
        cellRenderer: params => (
          <CellRender
            params={params}
            isBasic={true}
            value={params.value ? params.value.toLocaleString("en-US") : ""}
          />
        ),
      },
      {
        field: "buyForeignValue",
        headerName: "PriceBoard:Header:FbuyVal",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 80,
        hide: true,
        cellRenderer: params => (
          <CellRender
            params={params}
            isBasic={true}
            value={params.value ? params.value.toLocaleString("en-US") : ""}
          />
        ),
      },
      {
        field: "sellForeignQtty",
        headerName: "PriceBoard:Header:NNFsell",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 70,
        cellRenderer: params => (
          <CellRender
            params={params}
            isBasic={true}
            value={params.value ? params.value.toLocaleString("en-US") : ""}
          />
        ),
      },
      {
        field: "sellForeignValue",
        headerName: "PriceBoard:Header:FsellVal",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 80,
        hide: true,
        cellRenderer: params => (
          <CellRender
            params={params}
            isBasic={true}
            value={params.value ? params.value.toLocaleString("en-US") : ""}
          />
        ),
      },
      {
        field: "remainForeignQtty",
        headerName: "Room",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 90,
        cellRenderer: params => (
          <CellRender
            params={params}
            isBasic={true}
            value={params.value ? params.value.toLocaleString("en-US") : ""}
          />
        ),
      },
    ],
  },
];
