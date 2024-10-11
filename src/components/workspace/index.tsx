import AssetDetailEquity from "components/asset-detail-equity";
import BoardAgreement from "components/board-agreement";
import BoardPriceMini from "components/board-price-mini";
import CustomerAccount from "components/customer-account";
import CustomerGroup from "components/customer-group";
import DerivativesOrder from "components/derivatives-order";
import DerivativesOrderBook from "components/derivatives-order-book";
import { OsdRealTimeProvider } from "components/derivatives-order/contexts/derivative-order-data-realtime-context";
import { DerivativesOrderProvider } from "components/derivatives-order/contexts/derivatives-order-context";
import EquitiesOrderBasket from "components/equities-order-basket";
import EquityOrder from "components/equity-order";
import EquityOrderBook from "components/equity-order-book";
import LockPermissionComponent from "components/lock-permission";
import MarketDepth from "components/market-depth";
import OrderHistory from "components/order-history";
import OrderMatched from "components/order-matched";
import PlaceOrder from "components/place-order";
import PnlHistory from "components/pnl-history";
import Portfolio from "components/portfolio";
import PriceBoard from "components/price-board";
import { SVGIcons } from "components/svg-icons";
import TechnicalChart from "components/technical-chart";
import { defaultBlankWorkspace, FlexLayoutActionType, SYMBOL_DEFAULT } from "constants/workspace";
import { EOBContextProvider } from "contexts/equities-order-basket";
import { DropListsContextProvider } from "contexts/manage-drop-lists";
import * as FlexLayout from "flexlayout-react";
import { extractTabs } from "layouts/main/left-sidebar/widgets";
import { difference, get, uniq } from "lodash";
import { useLayoutContext } from "providers/layout";
import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector, WorkspaceActions } from "redux-toolkit";
import { EquityOrderActions } from "redux-toolkit/slices/equity-order.slice";
import { IWorkspace, SearchStockSymbolKey, TLinkInfo } from "types";
import { EWidgetName } from "types/widget";
import { WorkspaceUtil } from "util/index";
import LinkButton from "./link-button";
import styles from "./styles.module.scss";

export default React.memo(function Workspace() {
  const [openPopout, setOpenPopout] = React.useState<string[]>([]);
  const [model, setModel] = React.useState<FlexLayout.Model | null>(null);

  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    layoutRef,
    handleChangeWorkspace,
    handleUpdateLinkWorkspace,
    isCreateTemp,
    parseLinkInfoData,
  } = useLayoutContext();
  const lastSearchStockSymbol = useAppSelector(state => state.user.userInfo.lastSearchStockSymbol);
  const {
    widget: widgetList,
    workspace: { coreUserId, addingTab, workspaceListByFOUser },
  } = useAppSelector(state => state);

  const icons = React.useRef<FlexLayout.IIcons>({
    close: (
      <div className="text-gray-300">
        <SVGIcons.IconClose />
      </div>
    ),
    maximize: <SVGIcons.IconMaximize />,
    popout: <SVGIcons.IconPopout />,
    more: <SVGIcons.ArrowDown className="w-2 h-2 mr-1" />,
  }).current;

  useEffect(() => {
    dispatch(EquityOrderActions.resetCurrentEquityOrderStock());
  }, []);

  const transSymbol = useCallback(
    (tabLinkId, tabSymbol, component, widgetType?: SearchStockSymbolKey) => {
      const shownWorkspace = getShownWorkspaces();
      const links = WorkspaceUtil?.getLinksWorkspace(shownWorkspace);
      const extractTabLayouts = extractTabs(shownWorkspace?.configuration?.layout?.layout)
        ?.filter(({ name }) => name === component)
        ?.map(({ id }) => id);

      const getOldSearchSymbol = get(
        lastSearchStockSymbol,
        `[${widgetType}][${tabLinkId}]`,
        SYMBOL_DEFAULT
      );

      if (
        links?.[tabLinkId]?.tabIds?.length > 1 &&
        difference(links?.[tabLinkId]?.tabIds, extractTabLayouts)?.length > 0
      ) {
        return tabSymbol;
      }

      return getOldSearchSymbol;
    },
    [coreUserId, workspaceListByFOUser]
  );

  const factory: FlexLayout.ILayoutProps["factory"] = (node: FlexLayout.TabNode) => {
    const tabId = node.toJson().id;
    const { tabSymbol, accountId, orderSymbol, tabLinkId, isNewSymbol }: TLinkInfo =
      parseLinkInfoData(coreUserId, workspaceListByFOUser, tabId);
    const component = node?.getComponent();
    const foundWidgetIndex = widgetList?.permissions
      ? widgetList?.permissions?.findIndex(e => e?.name === component)
      : null;
    if (foundWidgetIndex < 0) {
      return <LockPermissionComponent />;
    }
    switch (component) {
      case EWidgetName.PRICE_BOARD:
        return <PriceBoard node={node} />;
      case "BoardPriceMini":
        return <BoardPriceMini symbol={tabSymbol} />;
      case "BoardAgreement":
        return <BoardAgreement />;
      case "PlaceOrder":
        return <PlaceOrder symbol={tabSymbol} />;
      case EWidgetName.MARKET_DEPTH:
        const symbolMarketDepth = transSymbol(
          tabLinkId,
          tabSymbol,
          component,
          SearchStockSymbolKey.MARKET_DEPTH
        );
        return <MarketDepth symbol={symbolMarketDepth} linkId={tabLinkId} node={node} />;
      case EWidgetName.TECHNICAL_CHART:
        const symbolTechnicalChart = transSymbol(
          tabLinkId,
          tabSymbol,
          component,
          SearchStockSymbolKey.TECHNICAL_CHART
        );
        return <TechnicalChart linkSymbol={symbolTechnicalChart} linkId={tabLinkId} node={node} />;
      case EWidgetName.EQUITY_ORDER:
        const shownWorkspace = getShownWorkspaces();
        const links = WorkspaceUtil.getLinksWorkspace(shownWorkspace);
        return (
          <EquityOrder
            orderSymbol={
              links?.[tabLinkId]?.tabIds.length > 1 ? tabSymbol : orderSymbol ? orderSymbol : ""
            }
            linkId={tabLinkId}
            accountId={accountId}
            node={node}
          />
        );
      case EWidgetName.ORDER_MATCHING_INFO:
        const symbolOrderMatching = transSymbol(
          tabLinkId,
          tabSymbol,
          component,
          SearchStockSymbolKey.ORDER_MATCHING_INFO
        );

        return <OrderMatched symbol={symbolOrderMatching} linkId={tabLinkId} node={node} />;
      case EWidgetName.ORDER_BASKET_EQUITY:
        return (
          <EOBContextProvider tabSymbol={tabSymbol} accountId={accountId} linkId={tabLinkId}>
            <DropListsContextProvider>
              <EquitiesOrderBasket node={node} />{" "}
            </DropListsContextProvider>
          </EOBContextProvider>
        );

      case EWidgetName.EQUITY_ORDER_BOOK:
        return <EquityOrderBook node={node} linkId={tabLinkId} tabAccountId={accountId} />;
      case EWidgetName.ACCOUNT_GROUP_MANAGEMENT:
        return <CustomerGroup node={node} linkId={tabLinkId} />;
      case EWidgetName.CLIENT_INFOMATION:
        return <CustomerAccount node={node} linkId={tabLinkId} tabAccountId={accountId} />;
      case EWidgetName.ASSET_DETAIL_EQUITY:
        return <AssetDetailEquity node={node} linkAccountId={accountId} linkId={tabLinkId} />;
      case EWidgetName.ASSET_PORTFOLIO_EQUITY:
        return <Portfolio linkAccountId={accountId} linkId={tabLinkId} node={node} />;
      case EWidgetName.PNL_HISTORY_EQUITY:
        return (
          <PnlHistory
            tabSymbol={isNewSymbol ? tabSymbol : ""}
            linkId={tabLinkId}
            linkAccountId={accountId}
            node={node}
          />
        );
      case EWidgetName.ORDER_HISTORY_EQUITY:
        return (
          <OrderHistory
            tabSymbol={isNewSymbol ? tabSymbol : ""}
            linkId={tabLinkId}
            linkAccountId={accountId}
            node={node}
          />
        );
      case EWidgetName.ORDER_DERIVATIVE:
        return (
          <DerivativesOrderProvider node={node} linkId={tabLinkId}>
            <OsdRealTimeProvider node={node} linkId={tabLinkId}>
              <DerivativesOrder
                nodeId={node.getId()}
                orderSymbol={tabSymbol}
                linkId={tabLinkId}
                accountId={accountId}
                node={node}
              />
            </OsdRealTimeProvider>
          </DerivativesOrderProvider>
        );
      case EWidgetName.ORDER_BOOK_DERIVATIVE:
        return <DerivativesOrderBook linkId={tabLinkId} linkAccountId={accountId} node={node} />;
      case "button":
        return <button>{node.getName()}</button>;
      default:
        return <button>{node.getName() + tabSymbol}</button>;
    }
  };

  const onRenderTab: FlexLayout.ILayoutProps["onRenderTab"] = (
    node: FlexLayout.TabNode,
    renderValues: FlexLayout.ITabRenderValues
  ) => {
    const currentNodeData = node?.toJson();
    const name = renderValues.content;
    renderValues.content = t(`Widget:Function:${name}`);
    renderValues.leading = <LinkButton tabId={currentNodeData.id} />;
  };

  const handleBeforeUnload = (event, node) => {
    // Action when close window popout
    const currentWidget = node?.getChildren()?.find(el => el?.isVisible() === true) ?? null;
    if (currentWidget) {
      setOpenPopout(prev => prev?.filter(widgetId => widgetId !== currentWidget?.getId()));
    }
    event.target.removeEventListener("beforeunload", handleBeforeUnload);
  };

  const handleOpenPopout = (node: FlexLayout.TabSetNode) => {
    const component = node.getChildren().find(el => el?.isVisible() === true);
    const name = component?.toJson()?.["component"];

    let newWindow: any = window.open(
      "/popout",
      "_blank",
      `location=yes,height=570,width=${
        window.screen.width * 0.8
      },scrollbars=yes,status=yes,top=200,left=40`
    );
    newWindow.node = component;

    //set title of window
    setTimeout(() => {
      newWindow.document.title = t(`Widget:Function:${name}`);
      newWindow.addEventListener("beforeunload", event => handleBeforeUnload(event, node));
    }, 500);
  };

  const onRenderTabSet = (
    node: FlexLayout.TabSetNode,
    renderValues: FlexLayout.ITabSetRenderValues
  ) => {
    const currentWidget = node?.getChildren()?.find(el => el?.isVisible() === true) ?? null;
    const component = currentWidget ? get(currentWidget?.toJson(), "component", "") : null;
    const foundWidgetIndex = widgetList?.permissions
      ? widgetList?.permissions?.findIndex(e => e?.name === component)
      : null;
    if (!currentWidget || (currentWidget && foundWidgetIndex < 0)) {
      renderValues.buttons = [];
      return;
    }

    renderValues.buttons = [
      <button
        key="popout-button"
        disabled={openPopout.includes(currentWidget.getId())}
        className={styles["popoutBtn"]}
        onClick={() => {
          handleOpenPopout(node);
          setOpenPopout(prev => uniq([...prev, currentWidget.getId()]));
        }}
      >
        <SVGIcons.IconPopout />
      </button>,
    ];
  };

  const handleModelChange = (modelTmp: FlexLayout.Model, { type, data }: FlexLayout.Action) => {
    handleChangeWorkspace(modelTmp?.toJson());
    if (type === FlexLayoutActionType.DELETE_TAB) {
      handleUpdateLinkWorkspace(modelTmp?.toJson(), data?.node);
    }
  };

  const getShownWorkspaces = (): IWorkspace | null => {
    const currentWorkspaceId = workspaceListByFOUser?.[coreUserId]?.currentWorkspaceId ?? null;
    const savedWorkspaces = workspaceListByFOUser?.[coreUserId]?.workspaceList ?? [];
    const findWorkspace = WorkspaceUtil?.findWorkspace(currentWorkspaceId, savedWorkspaces);

    if (
      (currentWorkspaceId && !findWorkspace?.isTemplate) ||
      (findWorkspace?.isTemplate && isCreateTemp)
    ) {
      return findWorkspace;
    }

    return workspaceListByFOUser?.[coreUserId]?.creatingWorkspace ?? defaultBlankWorkspace;
  };

  const effectChangeLayout = () => {
    const shownWorkspace = getShownWorkspaces();
    const layoutGlobalDefault = get(defaultBlankWorkspace, "configuration.layout.global", {});
    setModel(
      FlexLayout.Model.fromJson({
        ...shownWorkspace?.configuration?.layout,
        global: layoutGlobalDefault,
        layout: {
          ...shownWorkspace?.configuration?.layout?.layout,
          //disable default float of flexlayout
          children: shownWorkspace?.configuration?.layout?.layout?.children?.map(item => {
            return {
              ...item,
              children: WorkspaceUtil.disableFloatTab(item),
            };
          }),
        },
      })
    );
  };

  const effectAddTab = () => {
    if (addingTab && layoutRef?.current) {
      layoutRef.current.addTabWithDragAndDrop(
        `${t("Workspace:Message drag widget")} ${t(`Widget:Function:${addingTab.dragText}`)}`,
        addingTab.jsonTabNode,
        node => {
          if (node) {
            handleChangeWorkspace(node.getModel().toJson(), node.getId());
          }
          dispatch(WorkspaceActions.setAddingTab(null));
        }
      );
    }
  };

  React.useEffect(effectChangeLayout, [
    workspaceListByFOUser?.[coreUserId].currentWorkspaceId,
    workspaceListByFOUser?.[coreUserId].creatingWorkspace,
    workspaceListByFOUser?.[coreUserId].workspaceList,
    isCreateTemp,
  ]);
  React.useEffect(effectAddTab, [addingTab]);

  return (
    <React.Fragment>
      {model ? (
        <FlexLayout.Layout
          model={model}
          factory={factory}
          icons={icons}
          ref={layoutRef}
          onRenderTab={onRenderTab}
          onRenderTabSet={onRenderTabSet}
          onModelChange={handleModelChange}
          i18nMapper={() => {
            return "";
          }}
        />
      ) : null}
    </React.Fragment>
  );
});
