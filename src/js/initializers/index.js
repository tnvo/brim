/* @flow */

import {ipcRenderer} from "electron"

import closeWindow from "../flows/closeWindow"
import initBoom from "./initBoom"
import initDOM from "./initDOM"
import initGlobalStore from "./initGlobalStore"
import initMenuActionListeners from "./initMenuActionListeners"
import initQueryParams, {getQueryParams} from "./initQueryParams"
import initShortcuts from "./initShortcuts"
import initStore from "./initStore"
import invoke from "../electron/ipc/invoke"
import ipc from "../electron/ipc"
import refreshWindow from "../flows/refreshWindow"

let {id} = getQueryParams()

export default () => {
  return Promise.all([
    invoke(ipc.windows.initialState(id)),
    initGlobalStore()
  ]).then(([initialState, globalStore]) => {
    let boom = initBoom(undefined)
    let store = initStore({...initialState, ...globalStore.getState()}, boom)
    let dispatch = store.dispatch
    initDOM()
    initShortcuts(store)
    initMenuActionListeners(dispatch)
    initQueryParams(store)

    global.getState = store.getState
    global.getGlobalState = globalStore.getState

    ipcRenderer.on("globalStore:dispatch", (e, {action}) => dispatch(action))
    ipcRenderer.on("close", () => dispatch(closeWindow()))
    global.onbeforeunload = () => dispatch(refreshWindow())

    return {store, globalStore}
  })
}
