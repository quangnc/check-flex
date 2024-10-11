import { UserService } from "services";
import { UserSettings } from "./user-settings";
import { TableType } from "constants/price-board";

export const getColumnState = (settingUtilities: Partial<UserSettings>, type: TableType) => {
  return settingUtilities?.priceTablesColumnState?.[type] || [];
};

export const getAllColumnState = (settingUtilities: Partial<UserSettings>) => {
  return settingUtilities?.priceTablesColumnState ?? {};
};

export const saveColumnState = async (
  settingUtilities: Partial<UserSettings>,
  type: TableType,
  data
) => {
  const newSettings = {
    ...settingUtilities,
    priceTablesColumnState: {
      ...settingUtilities.priceTablesColumnState,
      [type]: data,
    },
  };
  try {
    await UserService.saveUserSettings({
      settings: newSettings,
    });
  } catch (error) {}
};
