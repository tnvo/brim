/* @flow */

import {PER_PAGE} from "../reducers/logViewer"
import {
  changeSearchBarInput,
  setCurrentSpaceName,
  setInnerTimeWindow,
  setOuterTimeWindow,
  setSpaceInfo
} from "../actions"
import {fetchMainSearch} from "./mainSearch"
import {initTimeWindow} from "./timeWindow"
import MockBoomClient from "../../test/MockBoomClient"
import initTestStore from "../../test/initTestStore"

let store, boom

beforeEach(() => {
  boom = new MockBoomClient({host: "localhost", port: 123})
  store = initTestStore(boom)
})

const spaceInfo = {
  name: "ranch-logs",
  min_time: {sec: 1425564900, ns: 0},
  max_time: {sec: 1428917793, ns: 750000000}
}

test("fetching an analytics search", (done) => {
  boom.stubStream("stream")

  const actions = [
    setSpaceInfo(spaceInfo),
    setCurrentSpaceName("ranch-logs"),
    changeSearchBarInput("* | count()"),
    fetchMainSearch()
  ]

  actions.forEach(store.dispatch)
  setTimeout(() => {
    const dispatched = store.getActions().map((action) => action.type)
    expect(dispatched).toEqual(
      expect.arrayContaining([
        "SEARCH_HISTORY_PUSH",
        "LOGS_CLEAR",
        "ANALYSIS_CLEAR",
        "SHOW_ANALYTICS_TAB"
      ])
    )
    done()
  })
})

test("analytics always use the outer time window", (done) => {
  boom.stubStream("stream")
  const stream = jest.spyOn(boom, "stream")

  store.dispatchAll([
    setSpaceInfo(spaceInfo),
    setCurrentSpaceName("ranch-logs"),
    changeSearchBarInput("* | count() | sort -r count"),
    setInnerTimeWindow([new Date(2015, 2, 10), new Date(2015, 2, 11)]),
    setOuterTimeWindow([new Date(2000, 0, 1), new Date(3000, 0, 1)]),
    fetchMainSearch()
  ])

  setTimeout(() => {
    expect(stream).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        searchSpan: [new Date(2000, 0, 1), new Date(3000, 0, 1)]
      })
    )
    done()
  })
})

test("search with inner time window if set", (done) => {
  boom.stubStream("stream")
  const stream = jest.spyOn(boom, "stream")

  store.dispatchAll([
    setSpaceInfo(spaceInfo),
    setCurrentSpaceName("ranch-logs"),
    changeSearchBarInput("_path = conn"),
    setInnerTimeWindow([new Date(2015, 2, 10), new Date(2015, 2, 11)]),
    fetchMainSearch()
  ])

  setTimeout(() => {
    expect(stream).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        searchSpan: [new Date(2015, 2, 10), new Date(2015, 2, 11)]
      })
    )
    done()
  })
})

test("search with inner time", (done) => {
  boom.stubStream("search")
  const search = jest.spyOn(boom, "search")

  store.dispatchAll([
    setSpaceInfo(spaceInfo),
    setCurrentSpaceName("ranch-logs"),
    changeSearchBarInput("_path = conn"),
    setInnerTimeWindow([new Date(2015, 2, 10), new Date(2015, 2, 11)]),
    fetchMainSearch()
  ])

  setTimeout(() => {
    expect(search).toHaveBeenCalledWith(
      `_path = conn | head ${PER_PAGE}`,
      expect.any(Object)
    )
    done()
  })
})

test("search with outerTimeWindow if no inner", (done) => {
  boom.stubStream("stream")
  const stream = jest.spyOn(boom, "stream")

  store.dispatchAll([
    setSpaceInfo(spaceInfo),
    setCurrentSpaceName("ranch-logs"),
    changeSearchBarInput("_path = conn"),
    setOuterTimeWindow([new Date(2000, 0, 1), new Date(3000, 0, 1)]),
    setInnerTimeWindow(null),
    fetchMainSearch()
  ])

  setTimeout(() => {
    expect(stream).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        searchSpan: [new Date(2000, 0, 1), new Date(3000, 0, 1)]
      })
    )
    done()
  })
})

test("fetching a regular search", (done) => {
  boom.stubStream("stream")
  const actions = [
    setSpaceInfo(spaceInfo),
    setCurrentSpaceName("ranch-logs"),
    initTimeWindow(),
    changeSearchBarInput("_path=conn"),
    fetchMainSearch()
  ]

  actions.forEach(store.dispatch)
  setTimeout(() => {
    expect(store.getActions().map((action) => action.type)).toEqual(
      expect.arrayContaining([
        "SEARCH_HISTORY_PUSH",
        "LOGS_CLEAR",
        "ANALYSIS_CLEAR",
        "SHOW_LOGS_TAB"
      ])
    )
    done()
  })
})

test("not saving a search to history", (done) => {
  boom.stubStream("stream")
  const actions = [
    setSpaceInfo(spaceInfo),
    setCurrentSpaceName("ranch-logs"),
    changeSearchBarInput("_path=conn"),
    fetchMainSearch({saveToHistory: false})
  ]

  actions.forEach(store.dispatch)

  setTimeout(() => {
    const dispatched = store.getActions().map((action) => action.type)
    expect(dispatched).not.toContain("SEARCH_HISTORY_PUSH")
    done()
  })
})

test("a bad search query", () => {
  const actions = [
    setSpaceInfo(spaceInfo),
    setCurrentSpaceName("ranch-logs"),
    changeSearchBarInput("_ath="),
    fetchMainSearch()
  ]
  actions.forEach(store.dispatch)

  expect(store.getActions().map((action) => action.type)).toEqual(
    expect.arrayContaining(["SEARCH_BAR_PARSE_ERROR"])
  )
})