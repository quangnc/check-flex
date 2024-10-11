import React, { useCallback, useContext, useRef, useState } from "react";
import * as FlexLayout from "flexlayout-react";
import { WorkspaceActions, useAppDispatch, useAppSelector } from "redux-toolkit";
import {
  ILinkId,
  IWorkspace,
  IWorkspaceByCoreId,
  IWorkspaceLinks,
  TLinkInfo,
  Workspace,
} from "types/workspace";
import { SYMBOL_DEFAULT, defaultLinkId, defaultUnlinkId } from "constants/workspace";
import { WorkspaceUtil } from "util/workspace.util";

type TNewTabId = string | null;

type IContext = {
  layoutRef: React.MutableRefObject<FlexLayout.Layout | null>;
  handleChangeWorkspace: any;
  isCreateTemp: boolean;
  setCreateTemp?: (arg) => void;
  handleUpdateLinkWorkspace: any;
  widgetComponent?: any;
  setWidgetComponent?: (arg) => void;
  changeLinkData: (data: any, linkId: number) => void;
  parseLinkInfoData?: (
    uid: string,
    workspaceList: Workspace<IWorkspaceByCoreId>,
    tabId: string
  ) => TLinkInfo;
  setLinkWorkspace?: (
    links: IWorkspaceLinks[],
    newTabId: TNewTabId,
    linkId?: number
  ) => IWorkspaceLinks[];
};

const LayoutContext = React.createContext<IContext>({
  layoutRef: null,
  isCreateTemp: false,
  handleChangeWorkspace: () => {},
  widgetComponent: null,
  setLinkWorkspace: () => [],
  setWidgetComponent: () => {},
  changeLinkData: () => {},
  handleUpdateLinkWorkspace: () => {},
  setCreateTemp: () => {},
});

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const layoutRef = useRef<FlexLayout.Layout | null>(null);
  const [isCreateTemp, setCreateTemp] = useState(false);

  const dispatch = useAppDispatch();
  const { coreUserId, workspaceListByFOUser } = useAppSelector(state => state.workspace);
  const [widgetComponent, setWidgetComponent] = useState(null);
  const handleChangeWorkspace = useCallback(
    (
      newWorkspace: FlexLayout.IJsonModel,
      newTabId: TNewTabId = null,
      linkId: ILinkId = defaultLinkId,
      tabSymbol: string = ""
    ) => {
      if (!coreUserId) return;
      const workspaceDataByCoreId = workspaceListByFOUser?.[coreUserId];
      if (!workspaceDataByCoreId) return;
      if (workspaceDataByCoreId.creatingWorkspace) {
        const creatingWorkspace = workspaceDataByCoreId.creatingWorkspace;
        const linksTmp = setLinkWorkspace(
          creatingWorkspace.configuration.links,
          newTabId,
          linkId,
          tabSymbol
        );
        const newLayout = {
          ...creatingWorkspace,
          configuration: {
            ...creatingWorkspace?.configuration,
            layout: newWorkspace,
            links: linksTmp,
          },
        };
        dispatch(WorkspaceActions.setCreatingWorkspace(newLayout));
      } else {
        const workspaceList = [...workspaceDataByCoreId.workspaceList];
        const workspaceIndex = workspaceList.findIndex(
          item => item.workspaceId === workspaceDataByCoreId.currentWorkspaceId
        );
        const linksTmp = setLinkWorkspace(
          workspaceList[workspaceIndex].configuration.links,
          newTabId,
          linkId,
          tabSymbol
        );
        const newLayout = {
          ...workspaceList[workspaceIndex],
          configuration: {
            ...workspaceList[workspaceIndex]?.configuration,
            layout: newWorkspace,
            links: linksTmp,
          },
        };
        workspaceList[workspaceIndex] = newLayout;
        dispatch(WorkspaceActions.setWorkspaceList(workspaceList));
      }
    },
    [coreUserId, workspaceListByFOUser]
  );

  const setLinkWorkspace = useCallback(
    (
      links: IWorkspaceLinks[],
      newTabId: TNewTabId = null,
      linkId = defaultLinkId,
      tabSymbol: string = ""
    ) => {
      const linksTmp = [...links];
      if (newTabId) {
        const defaultLink = { ...linksTmp[linkId] };
        const tabIds = defaultLink?.tabIds ? [...defaultLink?.tabIds] : [];
        tabIds.push(newTabId);
        defaultLink.tabIds = tabIds;
        if (tabSymbol !== "") {
          defaultLink.stockValue = { ...defaultLink.stockValue, symbol: tabSymbol };
        }
        linksTmp[linkId] = defaultLink;
      }
      return linksTmp;
    },
    []
  );

  const changeLinkData = useCallback(
    (data: any, linkId: number) => {
      const workspaceListByFOUserTmp = WorkspaceUtil.changeLinkData(
        workspaceListByFOUser,
        coreUserId,
        data,
        linkId
      );
      dispatch(WorkspaceActions.setWorkspaceListByFOUser(workspaceListByFOUserTmp));
    },
    [workspaceListByFOUser, coreUserId]
  );

  const handleGetLinkId = (currentWs: IWorkspace, targetTabId: string) => {
    const layout = FlexLayout.Model.fromJson(currentWs?.configuration?.layout).toJson();
    const links =
      WorkspaceUtil.getLinksConfiguration(layout, currentWs?.configuration?.links) ?? [];
    const changeDataLinks = links.reduce((acc, item) => {
      const filteredTabIds = item.tabIds.filter(tabId => tabId !== targetTabId);
      const modifiedItem = { ...item };
      modifiedItem.tabIds = filteredTabIds;
      acc.push(modifiedItem);
      return acc;
    }, []);

    return changeDataLinks;
  };

  const handleUpdateLinkWorkspace = useCallback(
    (modelTmp, tabId: string) => {
      const workspaceDataByCoreId = workspaceListByFOUser?.[coreUserId];
      const workspaceList = [...workspaceDataByCoreId.workspaceList];
      const workspaceIndex = workspaceList.findIndex(
        item => item.workspaceId === workspaceDataByCoreId.currentWorkspaceId
      );
      const currentWs = WorkspaceUtil.getCurrentWorkspace(coreUserId, workspaceListByFOUser);
      const links = handleGetLinkId(currentWs, tabId);
      const newLayout = {
        ...currentWs,
        configuration: {
          ...currentWs?.configuration,
          layout: modelTmp,
          links,
        },
      };
      if (workspaceIndex === -1) {
        dispatch(WorkspaceActions.setCreatingWorkspace(newLayout));
      } else {
        workspaceList[workspaceIndex] = newLayout;
        dispatch(WorkspaceActions.setWorkspaceList(workspaceList));
      }
    },
    [coreUserId, workspaceListByFOUser]
  );

  const parseLinkInfoData = useCallback(
    (uid: string, workspaceList: Workspace<IWorkspaceByCoreId>, tabId: string): TLinkInfo => {
      const currentWorkspace = WorkspaceUtil.getCurrentWorkspace(uid, workspaceList);
      const linkList = currentWorkspace?.configuration?.links ?? [];

      const matchingLink = linkList.find(link => link?.tabIds?.includes(tabId));
      if (!currentWorkspace) {
        return {
          tabSymbol: "",
          orderSymbol: "",
          accountId: "",
          tabLinkId: defaultLinkId,
          isNewSymbol: false,
          symbolDer: "",
          accountDerId: "",
        };
      }

      return matchingLink
        ? {
            tabSymbol: matchingLink.stockValue.symbol,
            orderSymbol: matchingLink.stockValue.orderSymbol,
            accountId: matchingLink.stockValue.accountId,
            tabLinkId: matchingLink.id,
            isNewSymbol: matchingLink.stockValue.isNewSymbol,
            symbolDer: matchingLink?.stockValue?.symbolDer,
            accountDerId: matchingLink?.stockValue?.accountDerId,
          }
        : {
            tabSymbol: linkList[defaultUnlinkId]?.stockValue?.symbol || SYMBOL_DEFAULT,
            orderSymbol: linkList[defaultUnlinkId]?.stockValue?.orderSymbol || "",
            accountId: "",
            tabLinkId: defaultUnlinkId,
            isNewSymbol: false,
            symbolDer: "",
            accountDerId: "",
          };
    },
    []
  );

  return (
    <LayoutContext.Provider
      value={{
        layoutRef,
        isCreateTemp,
        setCreateTemp,
        handleChangeWorkspace,
        widgetComponent,
        setWidgetComponent,
        parseLinkInfoData,
        changeLinkData,
        setLinkWorkspace,
        handleUpdateLinkWorkspace,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayoutContext = () => {
  return useContext(LayoutContext);
};
