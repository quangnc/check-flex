import { getDayBeforeXDate } from "util/format-data.util";
import { t } from "i18next";
import { createColorRender } from "util/convert-class.util";
import { getPriceField } from "util/get-fields.util";

export const getIndexOfPinTable = (array: any[], data: any) => {
  const sortData = array.sort((a, b) => a.orderIndex - b.orderIndex);

  //Calculate the number symbol of pins that precede the unpin symbol;
  const indexOflist = sortData.findIndex(x => x.orderIndex === data.orderIndex);
  //The new index in the table is equal to the old index minus the amount of pinned elements in front of the symbol
  const indexOftable =
    data.orderIndex > indexOflist ? data.orderIndex - indexOflist : data.orderIndex;

  return indexOftable;
};

export const getSymbolTooltip = (params, lang, daysBeforeXdate) => {
  let tooltip = `${params.data.exchange.toUpperCase()} - ${
    (lang === "vi" ? params.data.companyNameVi : params.data.companyNameEn) || ""
  } ${params.data.caStatus ? "- " + t(`PriceBoard:CAStatus:${params.data.caStatus}`) : ""}`;
  if (Array.isArray(params.data.corporateEvents) && params.data.corporateEvents.length > 0) {
    const data = [...params.data.corporateEvents].sort((a, b) => {
      const parseData = getDayBeforeXDate(b.exrightDate);
      if (parseData === 0) return 1;
      return -1;
    });
    data.forEach(event => {
      const parseData = getDayBeforeXDate(event.exrightDate);
      if (!event?.exrightDate || parseData > daysBeforeXdate) return;
      tooltip += `<br/> ${event?.eventTitle}<br/>
      ${t("PriceBoard:ExDate")}: ${event?.exrightDate ?? "-"}${
        event?.exrightDate && parseData > 0
          ? ` ${t(parseData > 1 ? "PriceBoard:HalfTimes" : "PriceBoard:HalfTime", {
              halfTime: parseData,
            })}`
          : ""
      }`;
    });
  }
  return tooltip;
};

export function checkDisplayIconUpcompingEvent(params, daysBeforeXdate: string | number) {
  if (
    (params.node.data.corporateEvents &&
      params.node.data.corporateEvents.length > 0 &&
      params.node.data.corporateEvents[0]?.exrightDate.length > 1 &&
      getDayBeforeXDate(params.node.data.corporateEvents[0]?.exrightDate) <=
        Number(daysBeforeXdate)) ||
    params.node.data.caStatus
  ) {
    return true;
  }
  return false;
}

export const customEquals = (prev, current) => {
  if (prev.value !== current.value) return false;
  if (prev.price === current.price) return true;
  const prevColor = createColorRender(prev.ceiling, prev.floor, prev.refPrice, prev.price);
  const currentColor = createColorRender(
    current.ceiling,
    current.floor,
    current.refPrice,
    current.price
  );
  if (prevColor === currentColor) return true;
  return false;
};

export const customComparator = (paramsA, paramsB) => {
  if (paramsA.value === paramsB.value) return 0;
  return paramsA.value > paramsB.value ? 1 : -1;
};

export const volumeValueGetter = api => {
  const field = api.colDef.field;
  const priceField = getPriceField(field);
  return {
    value: api.data[field],
    price: api.data[priceField],
    ceiling: api.data.ceiling,
    floor: api.data.floor,
    refPrice: api.data.refPrice,
  };
};

export const postSortRows = params => {
  const rowNodes = params.nodes;
  if (rowNodes.length === 0) return;
  const IndexfindFullWidth = rowNodes.findIndex(x => x.data.fullWidth);
  const fullWidthData = rowNodes.splice(IndexfindFullWidth, 1);
  rowNodes.splice(rowNodes.length, 0, fullWidthData[0]);
};
// eg 29/08/2004 gets converted to 20040829
function monthToComparableNumber(date: string) {
  if (date === undefined || date === null || date?.length !== 10) {
    return null;
  }
  const yearNumber = Number.parseInt(date?.substring(6, 10), 10);
  const monthNumber = Number.parseInt(date?.substring(3, 5), 10);
  const dayNumber = Number.parseInt(date?.substring(0, 2), 10);
  return yearNumber * 10000 + monthNumber * 100 + dayNumber;
}

export const dateComparator = (date1: string, date2: string) => {
  const date1Number = monthToComparableNumber(date1);
  const date2Number = monthToComparableNumber(date2);
  if (date1Number === null && date2Number === null) {
    return 0;
  }
  if (date1Number === null) {
    return -1;
  }
  if (date2Number === null) {
    return 1;
  }
  return date1Number - date2Number;
};
