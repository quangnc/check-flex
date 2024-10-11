/* eslint-disable import/no-extraneous-dependencies */
import "react-datepicker/dist/react-datepicker.css";
import styles from "./calendar.module.scss";

import React, { useEffect, useRef } from "react";
import moment from "moment";
import cx from "classnames";
import { useTranslation } from "react-i18next";
import Select, { components } from "react-select";
import DatePicker, { ReactDatePickerProps } from "react-datepicker";

import Clock from "assets/icons/clock.svg";
import { useAppSelector } from "redux-toolkit";
import ArrowUp from "assets/icons/arrow-time-up.svg";
import ArrowDown from "assets/icons/arrow-time-down.svg";
import { MAX_COLLAPSE_LEVEL } from "redux-toolkit/slices/collapse.slice";
import { ArrowLeftIcon } from "Icons/ArrowLeftIcon";
import { DotIcon } from "Icons/DotIcon";
import { SelectArrowIcon } from "Icons/SelectArrowIcon";

interface IProps extends ReactDatePickerProps {
  shouldDisplayTimeInput?: boolean;
  isSelectRange?: boolean;
}

const customStyles = {
  control: provided => ({
    ...provided,
    border: "none",
    outline: "none",
    boxShadow: "none",
    background: "transparent",
    minHeight: "2rem",
    cursor: "pointer",
  }),
  singleValue: style => ({
    ...style,
    color: "var(--label-month-date-picker)",
    fontSize: "0.875rem",
    fontWeight: 500,
  }),
  indicatorSeparator: style => ({ ...style, display: "none" }),
  menu: style => ({
    ...style,
    backgroundColor: "var(--left-sidebar-bg-color)",
    width: "6rem",
    top: "80%",
  }),
  menuList: base => ({
    ...base,
    maxHeight: "14rem",
  }),
};

const Calendar: React.FC<IProps> = ({
  onChange: onChangeDateTime,
  shouldDisplayTimeInput = true,
  isSelectRange = false,
  ...rest
}) => {
  const timeRef = React.useRef(null);
  const collapseLevel = useAppSelector(state => state.collapse.level);
  const { t } = useTranslation();

  const renderYears = () => {
    const currentYear = moment().year();
    const years = [];
    for (let i = currentYear - 10; i <= currentYear + 20; i++) {
      years.push(i);
    }
    return years;
  };

  const years = renderYears();
  const months = React.useMemo(() => {
    return [
      t("Calendar:January"),
      t("Calendar:February"),
      t("Calendar:March"),
      t("Calendar:April"),
      t("Calendar:May"),
      t("Calendar:June"),
      t("Calendar:July"),
      t("Calendar:August"),
      t("Calendar:September"),
      t("Calendar:October"),
      t("Calendar:November"),
      t("Calendar:December"),
    ];
  }, [t]);

  const TimeInputCustom = ({ value, onChange }) => {
    return (
      <div className={styles.timeInput}>
        <button
          onClick={() => {
            timeRef.current.showPicker();
          }}
        >
          <img src={Clock} />
        </button>
        <div className={styles.inputGroup}>
          <input
            value={value}
            ref={timeRef}
            type="time"
            className="inputTime"
            placeholder="Time"
            min="00:00"
            max="23:59"
            pattern="[0-9]{2}:[0-9]{2}"
            onChange={e => {
              onChange(e.target.value);
            }}
          />
          <div className={styles.buttonGroup}>
            <button className={styles.buttonTimeUp}>
              <img src={ArrowUp} />
            </button>
            <button className={styles.buttonTimeDown}>
              <img src={ArrowDown} />
            </button>
          </div>
        </div>
        <div className={styles.timezone}>(GMT+07:00)</div>
      </div>
    );
  };

  const isTopPlacement = () => {
    let divHeight = 0;
    let viewRenderHeight = 0;
    if (collapseLevel === 0) {
      divHeight = window.innerWidth < 1024 ? 406 : 382;
      viewRenderHeight = window.innerHeight - divHeight;
      return viewRenderHeight < 450;
    }
    if (collapseLevel === MAX_COLLAPSE_LEVEL) {
      divHeight = window.innerWidth < 1024 ? 214 : 190;
      viewRenderHeight = window.innerHeight - divHeight;
      return viewRenderHeight < 450;
    }
    divHeight = window.innerWidth < 1024 ? 305 : 274;
    viewRenderHeight = window.innerHeight - divHeight;
    return viewRenderHeight < 450;
  };

  return (
    <DatePicker
      formatWeekDay={nameOfDay => t("Calendar:" + nameOfDay)}
      popperPlacement={isTopPlacement() ? "top-start" : "bottom-start"}
      renderCustomHeader={({
        date,
        changeYear,
        changeMonth,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
      }) => {
        const dateFormat = typeof date === "number" ? new Date(date) : date;
        return (
          <div className={styles.header}>
            <SelectDateTime
              defaultVal={{
                value: months[dateFormat.getMonth()],
                label: months[dateFormat.getMonth()],
              }}
              handleChange={(val: string) => changeMonth(months.indexOf(val))}
              options={months}
            />

            <SelectDateTime
              defaultVal={{
                value: dateFormat.getFullYear(),
                label: dateFormat.getFullYear(),
              }}
              handleChange={(val: string) => changeYear(years[years.indexOf(val)])}
              options={years}
            />
            <div className={styles.action}>
              <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>
                <ArrowLeftIcon className="w-4 h-4 text-dark-200" />
              </button>
              <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>
                <DotIcon className="w-4 h-4 text-dark-200" />
              </button>
              <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>
                <ArrowLeftIcon className="w-4 h-4 rotate-180 text-dark-200" />
              </button>
            </div>
          </div>
        );
      }}
      onChange={onChangeDateTime}
      customTimeInput={
        shouldDisplayTimeInput && <TimeInputCustom value={undefined} onChange={undefined} />
      }
      calendarStartDay={1}
      inline
      selectsRange={isSelectRange}
      {...rest}
    />
  );
};

export default React.memo(Calendar);

type SelectDateTimeProps = {
  options: string[];
  handleChange: (val: string | number) => void;
  defaultVal: { value: string | number; label: string | number };
};

const SelectDateTime: React.FC<SelectDateTimeProps> = ({ options, handleChange, defaultVal }) => {
  return (
    <span className={styles.selectBox}>
      <Select
        value={defaultVal}
        onChange={({ value }) => handleChange(value)}
        options={options.map(item => ({ value: item, label: item }))}
        className="custom-drop-menu"
        components={{ Option, DropdownIndicator }}
        styles={customStyles}
        isSearchable={false}
      />
    </span>
  );
};

const Option = props => {
  const ref = useRef(null);

  useEffect(() => {
    if (props?.isSelected) ref?.current?.scrollIntoView();
  }, [props?.isSelected]);
  return (
    <components.Option
      {...props}
      innerRef={ref}
      className={cx(
        "text-sm bg-transparent cursor-pointer text-label-date hover:bg-blue-100 dark:hover:bg-dark-300 relative text-left",
        { "rc-active": props.isSelected }
      )}
    >
      {props.label}
    </components.Option>
  );
};
const DropdownIndicator = props => {
  return (
    components.DropdownIndicator && (
      <components.DropdownIndicator {...props} className="p-0">
        <SelectArrowIcon className="w-4 h-4 text-dark-200" />
      </components.DropdownIndicator>
    )
  );
};
