import fs from "fs";
import { exit } from "process";

import papaparse from "papaparse";

import { NAME_TO_ALIAS_MAP } from "@/constants";
import { Project, TimeEntry, TogglCsvJson } from "@/model";

export const convertDurationToSeconds = (duration: string): number => {
  const [hours, minutes, seconds] = duration.split(":").map((str) => parseInt(str, 10));
  return hours * 3600 + minutes * 60 + seconds;
};

export const convertSecondsToDuration = (_seconds: number): string => {
  const zeroPadding = (num: number): string => `00${num}`.slice(-2);

  const hours = Math.floor(_seconds / 3600);
  const minutes = Math.floor((_seconds % 3600) / 60);
  const seconds = _seconds % 60;

  return `${zeroPadding(hours)}:${zeroPadding(minutes)}:${zeroPadding(seconds)}`;
};

export const createTextFromProject = (project: Project, totalSeconds: number): string => {
  const getPercentageText = (seconds: number): string => `${((seconds / totalSeconds) * 100).toFixed(0)}%`;

  const alias = NAME_TO_ALIAS_MAP.get(project.name);
  const title = typeof alias !== "undefined" ? `${alias}(${project.name})` : project.name;

  let text = `- ${getPercentageText(project.durationSeconds)} [${convertSecondsToDuration(
    project.durationSeconds
  )}] ${title}\n`;
  project.timeEntries.forEach((timeEntry) => {
    text += `  - ${getPercentageText(timeEntry.durationSeconds)} [${convertSecondsToDuration(
      timeEntry.durationSeconds
    )}] ${timeEntry.name}\n`;
  });

  return text;
};

export const getProjectsFromCsv = (): { projects: Project[]; filePath: string } => {
  const CSV_DIR_PATH = "./csv";

  const direntArray = fs.readdirSync(CSV_DIR_PATH, { withFileTypes: true });
  direntArray.sort((a, b) => (a > b ? 1 : -1));
  const firstDirent = direntArray.find((dirent) => dirent.isFile());
  if (typeof firstDirent === "undefined") {
    // eslint-disable-next-line no-console
    console.error("ファイルが見つかりませんでした");
    exit(1);
  }

  const filePath = `${CSV_DIR_PATH}/${firstDirent.name}`;

  const file = fs.readFileSync(filePath);
  const parseResult = papaparse.parse(file.toString(), {
    header: true,
    // 最初のヘッダーがシングルクウォートで囲まれるバグの対処
    // https://github.com/mholt/PapaParse/issues/407
    // csvの最初に何か変なもの入ってるのかも
    transformHeader: (header) => header.trim(),
  });
  const togglJsonArray: TogglCsvJson[] = parseResult.data as TogglCsvJson[];
  const filteredTogglJsonArray = togglJsonArray.filter((togglJson) => togglJson.Project !== "");

  const projectArray: Project[] = [];
  filteredTogglJsonArray.forEach((togglJson) => {
    const timeEntry: TimeEntry = {
      name: togglJson.Title,
      durationSeconds: convertDurationToSeconds(togglJson.Duration),
    };

    const sameProject = projectArray.find((project) => project.name === togglJson.Project);
    if (typeof sameProject === "undefined") {
      projectArray.push({
        name: togglJson.Project,
        durationSeconds: convertDurationToSeconds(togglJson.Duration),
        timeEntries: [timeEntry],
      });
    } else {
      const timeEntryTotalSeconds = convertDurationToSeconds(togglJson.Duration);
      const projectTotalSeconds = sameProject.durationSeconds;
      sameProject.timeEntries.push(timeEntry);
      sameProject.durationSeconds = timeEntryTotalSeconds + projectTotalSeconds;
    }
  });

  return { projects: projectArray, filePath };
};
