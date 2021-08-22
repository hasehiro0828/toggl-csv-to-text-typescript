/* eslint-disable no-console */
import clipboardy from "clipboardy";
import { prompt } from "enquirer";

import { UNIMPORTANT_PROJECTS } from "@/constants";
import { convertSecondsToDuration, createTextFromProject, getProjectsFromCsv } from "@/utils";

const { projects: projectArray, filePath } = getProjectsFromCsv();

const main = async (): Promise<void> => {
  const totalSeconds = projectArray.map((project) => project.durationSeconds).reduce((sum, elm) => sum + elm);

  const unimportantProjects = projectArray.filter((project) => UNIMPORTANT_PROJECTS.includes(project.name));
  const importantProjects = projectArray.filter((project) => !UNIMPORTANT_PROJECTS.includes(project.name));

  const includesTime: { value: boolean } = await prompt({
    type: "confirm",
    name: "value",
    message: "時間を含めますか?",
  });

  let text = `Total Time: ${convertSecondsToDuration(totalSeconds)}\n\n`;
  importantProjects.forEach((project) => {
    text += createTextFromProject(project, totalSeconds, includesTime.value);
  });

  text += "\n---\n\n";

  unimportantProjects.forEach((project) => {
    text += createTextFromProject(project, totalSeconds, includesTime.value);
  });

  console.log(filePath);
  console.log(text);
  console.log("🎉クリップボードにコピーしました🎉");
  clipboardy.writeSync(text);
};

main();
