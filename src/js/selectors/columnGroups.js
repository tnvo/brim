/* @flow */
import type {State} from "../reducers/types"
import {createSelector} from "reselect"
import {getLogs} from "./logs"
import ColumnGroup from "../models/ColumnGroup"

export const getColumnGroups = (state: State) => {
  return state.columnGroups
}

export const getColumnGroup = (state: State, group: string) => {
  return getColumnGroups(state)[group]
}

export const getCurrentColumnGroupName = createSelector<State, void, *, *>(
  getLogs,
  logs => {
    if (logs.length === 0) return "MIXED_TYPES"
    const td = logs[0].get("_td")
    for (const log of logs) if (log.get("_td") !== td) return "MIXED_TYPES"
    return td
  }
)

export const getCurrentColumnGroup = createSelector<State, void, *, *, *>(
  getColumnGroups,
  getCurrentColumnGroupName,
  (groups, name) => new ColumnGroup(name, groups[name])
)
