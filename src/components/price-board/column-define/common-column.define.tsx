import { EStockType } from "constants/stock";
import { isEmpty, isNil } from "lodash";
import { getMatchedVolume } from "util/common.util";
import { formatDataDisplayBoarding } from "util/format-data.util";
import { customComparator, customEquals, volumeValueGetter } from "util/price-board/config-column";
import CellRender, { CellRenderStatic, CellRenderVolumeBoard } from "../cell/cell-render.component";
import CustomerHeader from "../cell/custom-header";
import { HeaderComponent } from "./equities-column.define";

export const commonColumn = [
  {
    field: "ceiling",
    headerName: "PriceBoard:Header:Ceil",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    minWidth: 65,
    cellRenderer: params => {
      return (
        <CellRenderStatic
          data={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
          className={"text-highest column-highlight"}
          params={params}
        />
      );
    },
  },
  {
    field: "floor",
    headerName: "PriceBoard:Header:Floor",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    minWidth: 65,
    cellRenderer: params => {
      return (
        <CellRenderStatic
          data={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
          className={"text-smallest column-highlight"}
          params={params}
        />
      );
    },
  },
  {
    field: "refPrice",
    headerName: "PriceBoard:Header:Ref",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    minWidth: 65,
    cellRenderer: params => {
      return (
        <CellRenderStatic
          data={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
          className={"text-medium column-highlight"}
          params={params}
        />
      );
    },
  },
  {
    headerName: "PriceBoard:Header:Bid",
    headerClass: "header-end",
    headerComponent: HeaderComponent,
    headerGroupComponent: HeaderComponent,
    children: [
      {
        field: "best10Bid",
        headerName: "PriceBoard:Header:P10",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 52,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best10BidVol",
        headerName: "PriceBoard:Header:Vol10",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best9Bid",
        headerName: "PriceBoard:Header:P9",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best9BidVol",
        headerName: "PriceBoard:Header:Vol9",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best8Bid",
        headerName: "PriceBoard:Header:P8",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best8BidVol",
        headerName: "PriceBoard:Header:Vol8",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best7Bid",
        headerName: "PriceBoard:Header:P7",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best7BidVol",
        headerName: "PriceBoard:Header:Vol7",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best6Bid",
        headerName: "PriceBoard:Header:P6",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best6BidVol",
        headerName: "PriceBoard:Header:Vol6",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best5Bid",
        headerName: "PriceBoard:Header:P5",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best5BidVol",
        headerName: "PriceBoard:Header:Vol5",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best4Bid",
        headerName: "PriceBoard:Header:P4",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best4BidVol",
        headerName: "PriceBoard:Header:Vol4",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best3Bid",
        headerName: "PriceBoard:Header:P3",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best3BidVol",
        headerName: "PriceBoard:Header:Vol3",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        minWidth: 50,
        hide: true,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best2Bid",
        headerName: "PriceBoard:Header:P2",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best2BidVol",
        headerName: "PriceBoard:Header:Vol2",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best1Bid",
        headerName: "PriceBoard:Header:P1",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 50,
        cellRenderer: params => {
          const value = params.value
            ? typeof params.value === "number"
              ? formatDataDisplayBoarding(params?.value, params?.data?.stockType)
              : params.value
            : "";
          return <CellRender params={params} value={value} isOrder />;
        },
      },
      {
        field: "best1BidVol",
        headerName: "PriceBoard:Header:Vol1",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
    ],
  },
  {
    headerName: "PriceBoard:Header:Matched",
    headerGroupComponent: HeaderComponent,
    children: [
      {
        field: "matchedPrice",
        headerName: "PriceBoard:Header:Price",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              classNameMore="column-highlight"
              isOrder
            />
          );
        },
      },
      {
        field: "matchedVolume",
        headerName: "PriceBoard:Header:Vol",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 50,
        equals: customEquals,
        valueGetter: api => {
          return {
            value: getMatchedVolume(api.data.matchedVolume, api.data.exchange),
            price: api.data.matchedPrice,
            ceiling: api.data.ceiling,
            floor: api.data.floor,
            refPrice: api.data.refPrice,
          };
        },
        comparator: customComparator,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} classNameMore="column-highlight" isOrder />;
        },
      },
      {
        field: "priceChange",
        headerName: "+/-",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 50,
        equals: (paramsA, paramsB) =>
          paramsA.value === paramsB.value && paramsA.price === paramsB.price,
        comparator: customComparator,
        valueGetter: ({
          data: { priceChange, matchedPrice, ceiling, floor, refPrice, ...data },
        }) => {
          const isDerivatives = data?.stockType === EStockType.derivatives;
          const formattedValue = +priceChange
            ? isDerivatives
              ? priceChange.toFixed(2)
              : formatDataDisplayBoarding(priceChange)
            : matchedPrice
              ? "0.00"
              : "";
          return {
            floor,
            ceiling,
            refPrice,
            value: formattedValue,
            price: matchedPrice,
          };
        },
        cellRenderer: params => {
          return (
            <CellRender params={params} classNameMore="column-highlight" notFormatted={true} />
          );
        },
      },
      {
        field: "priceChangePercent",
        headerName: "+/-(%)",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 50,
        equals: (paramsA, paramsB) =>
          paramsA.value === paramsB.value && paramsA.price === paramsB.price,
        comparator: customComparator,
        valueGetter: ({ data: { priceChangePercent, matchedPrice, ceiling, floor, refPrice } }) => {
          const priceChangePercentFormatted = isEmpty(priceChangePercent)
            ? ""
            : Number(priceChangePercent).toFixed(2) + "%";
          const formattedValue = priceChangePercentFormatted
            ? priceChangePercentFormatted
            : matchedPrice
              ? "0.00%"
              : "";
          return {
            floor,
            ceiling,
            refPrice,
            value: formattedValue,
            price: matchedPrice,
          };
        },
        cellRenderer: params => {
          return (
            <CellRender params={params} classNameMore="column-highlight" notFormatted={true} />
          );
        },
      },
    ],
  },
  {
    headerName: "PriceBoard:Header:Asked",
    headerGroupComponent: HeaderComponent,
    children: [
      {
        field: "best1Offer",
        headerName: "PriceBoard:Header:P1",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 50,
        cellRenderer: params => {
          const value = params.value
            ? typeof params.value === "number"
              ? formatDataDisplayBoarding(params?.value, params?.data?.stockType)
              : params.value
            : "";
          return <CellRender params={params} value={value} isOrder />;
        },
      },
      {
        field: "best1OfferVol",
        headerName: "PriceBoard:Header:Vol1",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best2Offer",
        headerName: "PriceBoard:Header:P2",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best2OfferVol",
        headerName: "PriceBoard:Header:Vol2",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best3Offer",
        headerName: "PriceBoard:Header:P3",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best3OfferVol",
        headerName: "PriceBoard:Header:Vol3",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        minWidth: 50,
        hide: true,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best4Offer",
        headerName: "PriceBoard:Header:P4",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best4OfferVol",
        headerName: "PriceBoard:Header:Vol4",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best5Offer",
        headerName: "PriceBoard:Header:P5",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best5OfferVol",
        headerName: "PriceBoard:Header:Vol5",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best6Offer",
        headerName: "PriceBoard:Header:P6",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best6OfferVol",
        headerName: "PriceBoard:Header:Vol6",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best7Offer",
        headerName: "PriceBoard:Header:P7",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best7OfferVol",
        headerName: "PriceBoard:Header:Vol7",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} />;
        },
      },
      {
        field: "best8Offer",
        headerName: "PriceBoard:Header:P8",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best8OfferVol",
        headerName: "PriceBoard:Header:Vol8",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best9Offer",
        headerName: "PriceBoard:Header:P9",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best9OfferVol",
        headerName: "PriceBoard:Header:Vol9",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
      {
        field: "best10Offer",
        headerName: "PriceBoard:Header:P10",
        headerClass: "header-end",
        headerComponent: CustomerHeader,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return (
            <CellRender
              params={params}
              value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
              isOrder
            />
          );
        },
      },
      {
        field: "best10OfferVol",
        headerName: "PriceBoard:Header:Vol10",
        headerClass: "header-end",
        equals: customEquals,
        valueGetter: volumeValueGetter,
        headerComponent: CustomerHeader,
        comparator: customComparator,
        hide: true,
        minWidth: 50,
        cellRenderer: params => {
          return <CellRenderVolumeBoard params={params} isOrder />;
        },
      },
    ],
  },
  {
    field: "nmTotalTradedQty",
    minWidth: 80,
    headerName: "PriceBoard:Header:TotalVol",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    cellRenderer: params => {
      return (
        <CellRender
          params={params}
          isBasic={true}
          value={params.value ? params.value.toLocaleString("en-US") : ""}
          classNameMore="column-highlight"
        />
      );
    },
  },
  {
    field: "highest",
    headerName: "PriceBoard:Header:High",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    minWidth: 50,
    cellRenderer: params => {
      return (
        <CellRender
          params={params}
          value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
          classNameMore="column-highlight"
        />
      );
    },
  },
  {
    field: "lowest",
    headerName: "PriceBoard:Header:Low",
    headerClass: "header-end",
    headerComponent: CustomerHeader,
    minWidth: 50,
    cellRenderer: params => {
      return (
        <CellRender
          params={params}
          value={formatDataDisplayBoarding(params?.value, params?.data?.stockType)}
          classNameMore="column-highlight"
        />
      );
    },
  },
];
