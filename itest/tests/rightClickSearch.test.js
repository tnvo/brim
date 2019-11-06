/* @flow */

import {basename} from "path"

import {dataSets, selectors} from "../../src/js/test/integration"
import {
  getSearchText,
  logIn,
  newAppInstance,
  resetState,
  searchDisplay,
  setSpan,
  startApp,
  startSearch,
  waitForSearch,
  writeSearch
} from "../lib/app.js"
import {handleError, stdTest} from "../lib/jest.js"
import contextMenuShim from "../lib/appIpc"
import mockSpace from "../../src/js/test/mockSpace"

describe("Test search mods via right-clicks", () => {
  let app
  let testIdx = 0
  let menu

  beforeEach(() => {
    app = newAppInstance(basename(__filename), ++testIdx)
    menu = contextMenuShim(app, "*", ["ts", "uid", "_path"], mockSpace())
    return startApp(app)
  })

  afterEach(async () => {
    if (app && app.isRunning()) {
      await resetState(app)
      return await app.stop()
    }
  })

  stdTest("Include / Exclude this value works", (done) => {
    let includeExcludeFlow = async () => {
      await logIn(app)

      menu.click(
        "Filter = value",
        dataSets.corelight.rightClickSearch.includeValue,
        dataSets.corelight.rightClickSearch.connLog
      )
      menu.click(
        "Filter != value",
        dataSets.all.rightClickSearch.connPathValue,
        dataSets.corelight.rightClickSearch.connLog
      )

      // The result order is deterministic because clicked a uid and then
      // removed its conn log entry.
      return searchDisplay(app)
    }
    includeExcludeFlow()
      .then((searchResults) => {
        expect(searchResults).toMatchSnapshot()
        done()
      })
      .catch((err) => {
        handleError(app, err, done)
      })
  })

  stdTest("Use as start/end time works", (done) => {
    let startEndFlow = async () => {
      await logIn(app)
      // The sort proc is used here to ensure that the two tuples that appear
      // with the same timestamp are deterministically sorted.  If PROD-647
      // is fixed, the results will still be deterministic because, although
      // two points with the same ts appear, they will be sorted by uid as
      // well.
      let program = "_path=conn | sort -r ts, uid"
      await writeSearch(app, program)
      await startSearch(app)
      await waitForSearch(app)

      menu
        .program(program)
        .click(
          'Use as "start" time',
          dataSets.corelight.rightClickSearch.startTime,
          dataSets.corelight.rightClickSearch.connLog
        )
        .click(
          'Use as "end" time',
          dataSets.corelight.rightClickSearch.endTime,
          dataSets.corelight.rightClickSearch.connLog
        )

      return searchDisplay(app)
    }
    startEndFlow()
      .then((searchResults) => {
        expect(searchResults).toMatchSnapshot()
        done()
      })
      .catch((err) => {
        handleError(app, err, done)
      })
  })

  stdTest("New Search works", (done) => {
    let newSearchFlow = async () => {
      await logIn(app)
      menu
        .click(
          "Filter = value",
          dataSets.corelight.rightClickSearch.newSearchSetup,
          dataSets.corelight.rightClickSearch.weirdLog
        )
        .click(
          "New search with this value",
          dataSets.all.rightClickSearch.weirdPathValue,
          dataSets.corelight.rightClickSearch.weirdLog
        )
      // The result order is deterministic because all the points rendered have
      // different ts values.
      return searchDisplay(app)
    }
    newSearchFlow()
      .then((searchResults) => {
        expect(searchResults).toMatchSnapshot()
      })
      // This section verifies the previous search was cleared in favor of
      // the new search "weird".
      .then(() => getSearchText(app))
      .then((searchText) => {
        expect(searchText).toBe('"weird"')
        done()
      })
      .catch((err) => {
        handleError(app, err, done)
      })
  })

  stdTest("Count by / Pivot to logs works", (done) => {
    let pivotToLogsFlow = async () => {
      await logIn(app)
      // If we want to "Count by" _path, we *must* select a conn cell,
      // because conn logs contain the _path of the connection. Searching for
      // "dns" will find either the first conn log tuple of a dns connection,
      // or the first dns log tuple of the same.
      menu
        .click(
          "Count by field",
          dataSets.all.rightClickSearch.connPathValue,
          dataSets.corelight.rightClickSearch.connLog
        )
        .program(await getSearchText(app))
        .click(
          "Pivot to logs",
          dataSets.all.rightClickSearch.dhcpPathValue,
          dataSets.corelight.rightClickSearch.dhcpLog
        )

      // The result order is deterministic because all the points rendered have
      // different ts values.
      return searchDisplay(app)
    }
    pivotToLogsFlow().then((searchResults) => {
      expect(searchResults).toMatchSnapshot()
      done()
    })
  })

  stdTest("conn for www.mybusinessdoc.com is found via correlation", (done) => {
    logIn(app)
      .then(() => setSpan(app, dataSets.corelight.logDetails.span))
      .then(() => writeSearch(app, dataSets.corelight.logDetails.initialSearch))
      .then(() => startSearch(app))
      .then(() => waitForSearch(app))
      .then(() => searchDisplay(app))
      // Search is deterministic because all tuples have different ts
      .then((results) => {
        expect(results).toMatchSnapshot()
      })
      .then(() => {
        menu
          .program(dataSets.corelight.logDetails.initialSearch)
          .click(
            "Open details",
            dataSets.corelight.logDetails.getDetailsFrom,
            dataSets.corelight.logDetails.myBusinessDocHttpLog
          )
      })
      .then(() =>
        Promise.all([
          app.client
            .waitForVisible(selectors.correlationPanel.tsLabel)
            .then(() => app.client.getText(selectors.correlationPanel.tsLabel)),
          app.client
            .waitForVisible(selectors.correlationPanel.pathTag)
            .then(() => app.client.getText(selectors.correlationPanel.pathTag)),
          app.client
            .waitForVisible(selectors.correlationPanel.duration)
            .then(() => app.client.getText(selectors.correlationPanel.duration))
            .then((result) => [result])
        ])
      )
      .then((correlationData) => {
        expect(correlationData).toMatchSnapshot()
        done()
      })
      .catch((err) => {
        handleError(app, err, done)
      })
  })
})
