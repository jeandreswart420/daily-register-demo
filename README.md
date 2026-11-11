# Daily Register (prototype)

A proof-of-concept school attendance register for a South African LSEN school that uses SA-SAMS.

**This is a prototype.** The classes and attendance records are a snapshot of a real school's registers, but every learner has an invented name, and Acc Nos, notes and the names of people who collected learners have been removed. Changes made in the demo are saved only in the browser you use (nothing is sent to a server).

## What it does

- **Register**: teachers mark their class on a phone, one learner card at a time: Present, Not present (reason not known yet), or one of the SA-SAMS absenteeism codes.
- **Absence reasons**: fill in the reason later, once the learner is back at school.
- **Overview**: the office sees the whole school live and signs learners in (late arrivals) and out (early departures).
- **Class log**: attendance, late arrivals and sign-outs per learner, for one class or all classes, ranked from best attendance to worst.
- **SA-SAMS**: downloads the week as an Excel workbook in the layout of SA-SAMS's Weekly Learner Attendance sheet, and lists today's absentees with their codes.
- **Setup**: edit classes and learners, or update a class from an SA-SAMS weekly register printout (.xls).

Use **Reset demo data** at the top of the page to go back to the snapshot in `data/`.

## Hosted demo

Served by GitHub Pages from the `main` branch: `https://<github-username>.github.io/<repository-name>/`

## Run it locally

There is no build step. Serve the folder with any static web server, for example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. The page loads its data from the `data/` folder, so it needs to be served over http; opening `index.html` straight from disk won't load the data.

## Files

- `index.html`: the app (HTML, CSS and JavaScript in one file)
- `data/classes.csv`: classes, SA-SAMS class names and departments
- `data/learners.csv`: one row per learner: id, class, invented surname and first name, M/F where known
- `data/registers.csv`: one row per learner per day: the attendance code (`PR` present, `AB` not present and reason not yet known, otherwise an SA-SAMS absenteeism code)
- `data/movements.csv`: sign-ins (late arrivals) and sign-outs: date, time, type, reason
- `demo/store.js`: stands in for the online database the full version uses. It reads the CSV files and keeps changes in `localStorage`.
- `.nojekyll`: tells GitHub Pages to serve the files as they are

The Excel export uses [SheetJS](https://sheetjs.com/) 0.18.5 from cdnjs, and the fonts come from Google Fonts.
