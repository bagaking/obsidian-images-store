import {
  addIcon,
  App,
  Notice,
  Plugin, PluginSettingTab, Setting,
  TFile, Vault, WorkspaceLeaf
} from "obsidian";

import {
  headerBreathProc,
  imageTagProcessor, quoteBreathProc,
  quoteListProc,
  redundantBlankProc,
  RegexProcessor,
  titleProc
} from "./contentProcessor";
import { replaceAsync, cleanContent, pathJoin, cleanFileName } from "./utils";
import {
  IConfig,
  DEFAULT_CONF,
  EXTERNAL_MEDIA_ASSET_LINK_PATTERN,
  ANY_URL_PATTERN,
  NOTICE_TIMEOUT,
  TIMEOUT_LIKE_INFINITY, VIEW_TYPE, ICON_NAME
} from "./config";
import { UniqueQueue } from "./uniqueQueue";
import safeRegex from "safe-regex";
import ImageStoreView from "./panel";

export default class LocalImagesPlugin extends Plugin {
  settings: IConfig;
  modifiedQueue = new UniqueQueue<TFile>();
  intervalId: number = null;
  view: ImageStoreView;

  private async tidyMarkdown(file: TFile, silent = false) {
    let syncContent = await this.app.vault.cachedRead(file);
    const showNotification = !silent && this.settings.showNotifications;
    let map: any = {};
    const doSync = function(v: string, proc: RegexProcessor): string {
      let newContent = proc.DoSync(v);
      map[proc.name] = v != newContent;
      return newContent;
    };
    await this.app.vault.modify(file, [quoteListProc, titleProc, redundantBlankProc, headerBreathProc, quoteBreathProc].reduce(doSync, syncContent));
    if (showNotification) {
      let str = `Process result of ${file.path}\n\n`;
      for (let key in map) {
        str += `${key} ${map[key] ? "√" : "X"}\n`;
      }
      new Notice(str);
    }
  }

  private async processPage(file: TFile, silent = false) {
    // const content = await this.app.vault.read(file);
    const content = await this.app.vault.cachedRead(file);

    let storeDir = this.settings.assetDir;
    if (this.settings.createFileDir) {
      storeDir = pathJoin(storeDir, cleanFileName(file.basename + ".assets"));
    }



    const cleanedContent = this.settings.cleanContent
      ? cleanContent(content)
      : content;

    let fixedContent = await replaceAsync(
      cleanedContent,
      EXTERNAL_MEDIA_ASSET_LINK_PATTERN,
      imageTagProcessor(this.app, storeDir, this.settings.namePattern, file)
    );

    if (content != fixedContent) {
      this.modifiedQueue.remove(file);
      await this.app.vault.modify(file, fixedContent);

      if (!silent && this.settings.showNotifications) {
        new Notice(`Images for "${file.path}" were processed.`);
      }
    } else {
      if (!silent && this.settings.showNotifications) {
        new Notice(
          `Page "${file.path}" has been processed, but nothing was changed.`
        );
      }
    }
  }

  // using arrow syntax for callbacks to correctly pass this context
  storeImageForActivePage = async () => {
    const activeFile = this.app.workspace.getActiveFile();
    await this.processPage(activeFile);
  };

  processAllPages = async () => {
    const files = this.app.vault.getMarkdownFiles();
    const includeRegex = new RegExp(this.settings.include, "i");

    const pagesCount = files.length;

    const notice = this.settings.showNotifications
      ? new Notice(
        `Local Images \nStart processing. Total ${pagesCount} pages. `,
        TIMEOUT_LIKE_INFINITY
      )
      : null;

    for (const [index, file] of files.entries()) {
      if (file.path.match(includeRegex)) {
        if (notice) {
          // setMessage() is undeclared but factically existing, so ignore the TS error

          notice.setMessage(
            `Local Images: Processing \n"${file.path}" \nPage ${index} of ${pagesCount}`
          );
        }
        await this.processPage(file, true);
      }
    }
    if (notice) {

      notice.setMessage(`Local Images: ${pagesCount} pages were processed.`);

      setTimeout(() => {
        notice.hide();
      }, NOTICE_TIMEOUT);
    }
  };

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "image-store-process-experts",
      name: "Tidy Experts",
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        await this.tidyMarkdown(activeFile);
        await this.storeImageForActivePage();
      }
    });

    this.addCommand({
      id: "image-store-tidy-md",
      name: "Tidy Markdown",
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        await this.tidyMarkdown(activeFile);
      }
    });

    this.addCommand({
      id: "download-images",
      name: "Download images locally",
      callback: this.storeImageForActivePage
    });

    this.addCommand({
      id: "download-images-all",
      name: "Download images locally for all your notes",
      callback: this.processAllPages
    });

    this.addCommand({
      id: "app:show-image-store-panel",
      name: "Show the Image Store Panel",
      callback: () => this.initLeaf(),
      hotkeys: []
    });

    addIcon(ICON_NAME, `<g>
  <title>Layer 1</title>
  <path stroke="null" id="svg_1" d="m27.83212,75.81482a3.97251,3.97251 0 0 0 5.61978,0l4.25191,-4.25191a1.32417,1.32417 0 0 0 -1.87238,-1.86841l-3.87453,3.87585l0.00927,-20.42799a1.32417,1.32417 0 0 0 -1.32417,-1.32417l0,0a1.32417,1.32417 0 0 0 -1.32417,1.32417l-0.01192,20.40284l-3.85334,-3.85069a1.32417,1.32417 0 0 0 -1.87238,1.8737l4.25191,4.24662z"/>
  <path stroke="null" id="svg_2" d="m86.18181,63.72727l0,0a3.27273,3.27273 0 0 0 -3.27273,3.27273l0,13.09091a3.27273,3.27273 0 0 1 -3.27273,3.27273l-58.90909,0a3.27273,3.27273 0 0 1 -3.27273,-3.27273l0,-13.09091a3.27273,3.27273 0 0 0 -3.27273,-3.27273l0,0a3.27273,3.27273 0 0 0 -3.27273,3.27273l0,13.09091a9.81818,9.81818 0 0 0 9.81818,9.81818l58.90909,0a9.81818,9.81818 0 0 0 9.81818,-9.81818l0,-13.09091a3.27273,3.27273 0 0 0 -3.27273,-3.27273z"/>
  <rect stroke="null" rx="8" id="svg_4" height="34.64646" width="44.54545" y="12.72727" x="27.27272"/>
  <path stroke="null" id="svg_6" d="m47.37758,75.81482a3.97251,3.97251 0 0 0 5.61979,0l4.25191,-4.25191a1.32417,1.32417 0 0 0 -1.87238,-1.86841l-3.87452,3.87585l0.00927,-20.42799a1.32417,1.32417 0 0 0 -1.32418,-1.32418l0,0a1.32417,1.32417 0 0 0 -1.32417,1.32418l-0.01191,20.40283l-3.85334,-3.85069a1.32417,1.32417 0 0 0 -1.87238,1.8737l4.25191,4.24662z"/>
  <path stroke="null" id="svg_7" d="m27.83212,75.81482a3.97251,3.97251 0 0 0 5.61979,0l4.25191,-4.25191a1.32417,1.32417 0 0 0 -1.87238,-1.86841l-3.87452,3.87585l0.00927,-20.42799a1.32417,1.32417 0 0 0 -1.32418,-1.32418l0,0a1.32417,1.32417 0 0 0 -1.32417,1.32418l-0.01191,20.40283l-3.85334,-3.85069a1.32417,1.32417 0 0 0 -1.87238,1.8737l4.25191,4.24662z"/>
  <path stroke="null" id="svg_8" d="m66.46848,75.81482a3.97251,3.97251 0 0 0 5.61979,0l4.25191,-4.25191a1.32417,1.32417 0 0 0 -1.87238,-1.86841l-3.87452,3.87585l0.00927,-20.42799a1.32417,1.32417 0 0 0 -1.32418,-1.32418l0,0a1.32417,1.32417 0 0 0 -1.32417,1.32418l-0.01191,20.40283l-3.85334,-3.85069a1.32417,1.32417 0 0 0 -1.87238,1.8737l4.25191,4.24662z"/>
 </g>`);

    const ribbonIconEl = this.addRibbonIcon("image_store", "Store Images", (evt: MouseEvent) => {
      // Called when the user clicks the icon.

      this.storeImageForActivePage();
    });

    this.registerCodeMirror((cm: CodeMirror.Editor) => {
      // on("beforeChange") can not execute async function in event handler, so we use queue to pass modified pages to timeouted handler
      cm.on("change", async (instance: CodeMirror.Editor, changeObj: any) => {
        if (
          changeObj.origin == "paste" &&
          ANY_URL_PATTERN.test(changeObj.text)
        ) {
          this.enqueueActivePage();
        }
      });
    });

    this.setupPanelInterval();
    this.setupQueueInterval();

    this.addSettingTab(new SettingTab(this.app, this));

    this.registerView(
      VIEW_TYPE, // 全局唯一常量，用于做 View 的唯一性
      (leaf: WorkspaceLeaf) => // WorkspaceLeaf 是 Obsidian Interface，这里只要捕获并透传就好了
        (this.view = new ImageStoreView(leaf, this.settings)) // ImageStoreView 是自己实现的 View 类, 继承自 Obsidian 的 ItemView
    );

  }

  setupPanelInterval() {
    window.setInterval(async () => {
      try {
        // const activeFile = this.app.workspace.getActiveFile();
        // this.view?.analyze(activeFile);
      } catch (error) {
        console.log(error);
      }
    }, 1000);
  }

  setupQueueInterval() {
    if (this.intervalId) {
      const intervalId = this.intervalId;
      this.intervalId = null;
      window.clearInterval(intervalId);
    }
    if (
      this.settings.realTimeUpdate &&
      this.settings.realTimeUpdateInterval > 0
    ) {
      this.intervalId = window.setInterval(
        this.processModifiedQueue,
        this.settings.realTimeUpdateInterval
      );
      this.registerInterval(this.intervalId);
    }
  }

  processModifiedQueue = async () => {
    const iteration = this.modifiedQueue.iterationQueue();
    for (const page of iteration) {
      this.processPage(page);
    }
  };

  enqueueActivePage() {
    const activeFile = this.app.workspace.getActiveFile();
    this.modifiedQueue.push(
      activeFile,
      this.settings.realTimeAttemptsToProcess
    );
  }

  // It is good idea to create the plugin more verbose
  displayError(error: Error | string, file?: TFile): void {
    if (file) {
      new Notice(
        `LocalImages: Error while handling file ${
          file.name
        }, ${error.toString()}`
      );
    } else {
      new Notice(error.toString());
    }

    console.error(`LocalImages: error: ${error}`);
  }


  async ensureFolderExists(folderPath: string) {
    try {
      await this.app.vault.createFolder(folderPath);
    } catch (error) {
      if (!error.message.contains("Folder already exists")) {
        throw error;
      }
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_CONF, await this.loadData());
    this.setupQueueInterval();
  }

  async saveSettings() {
    try {
      await this.saveData(this.settings);
    } catch (error) {
      this.displayError(error);
    }
  }

  initLeaf() {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length > 0) {
      return;
    }
    this.app.workspace.getRightLeaf(true).setViewState({ type: VIEW_TYPE });
  }

  onunload() {
  }
}

class SettingTab extends PluginSettingTab {
  plugin: LocalImagesPlugin;

  constructor(app: App, plugin: LocalImagesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Local images" });


    new Setting(containerEl)
      .setName("On paste processing")
      .setDesc("Process active page if external link was pasted.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.realTimeUpdate)
          .onChange(async (value) => {
            this.plugin.settings.realTimeUpdate = value;
            await this.plugin.saveSettings();
            this.plugin.setupQueueInterval();
          })
      );

    new Setting(containerEl)
      .setName("On paste processing interval")
      .setDesc("Interval in milliseconds for processing update.")
      .setTooltip(
        "I could not process content on the fly when it is pasted. So real processing implements periodically with the given here timeout."
      )
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.realTimeUpdateInterval))
          .onChange(async (value: string) => {
            const numberValue = Number(value);
            if (
              isNaN(numberValue) ||
              !Number.isInteger(numberValue) ||
              numberValue < 0
            ) {
              this.plugin.displayError(
                "Realtime processing interval should be a positive integer number!"
              );
              return;
            }
            this.plugin.settings.realTimeUpdateInterval = numberValue;
            await this.plugin.saveSettings();
            this.plugin.setupQueueInterval();
          })
      );

    new Setting(containerEl)
      .setName("Attempts to process")
      .setDesc(
        "Number of attempts to process content on paste. For me 3 attempts is enouth with 1 second update interval."
      )
      .setTooltip(
        "I could not find the way to access newly pasted content immediatily, after pasting, Plugin's API returns old text for a while. The workaround is to process page several times until content is changed."
      )
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.realTimeAttemptsToProcess))
          .onChange(async (value: string) => {
            const numberValue = Number(value);
            if (
              isNaN(numberValue) ||
              !Number.isInteger(numberValue) ||
              numberValue < 1 ||
              numberValue > 100
            ) {
              this.plugin.displayError(
                "Realtime processing interval should be a positive integer number greater than 1 and lower than 100!"
              );
              return;
            }
            this.plugin.settings.realTimeAttemptsToProcess = numberValue;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Clean content")
      .setDesc("Clean malformed image tags before processing.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.cleanContent)
          .onChange(async (value) => {
            this.plugin.settings.cleanContent = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show notifications")
      .setDesc("Show notifications when pages were processed.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showNotifications)
          .onChange(async (value) => {
            this.plugin.settings.showNotifications = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Include")
      .setDesc(
        "Include only files matching this regex pattern when running on all notes."
      )
      .addText((text) =>
        text.setValue(this.plugin.settings.include).onChange(async (value) => {
          if (!safeRegex(value)) {
            this.plugin.displayError(
              "Unsafe regex! https://www.npmjs.com/package/safe-regex"
            );
            return;
          }
          this.plugin.settings.include = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Storage folder")
      .setDesc("Folder to keep all downloaded media files.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.assetDir)
          .onChange(async (value) => {
            this.plugin.settings.assetDir = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Create File Dir")
      .setDesc(`Create a Dir under the assetsDir to store images.
e.g. when AssetDir = "foo", Filename == "bar", the image will be saved at path foo/bar.assets/image_full_name
      `)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.createFileDir)
          .onChange(async (value) => {
            this.plugin.settings.createFileDir = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Name Pattern")
      .setDesc(`The pattern indicates how the new name should be generated.
Available variables:
- {{Anchor}}: this variable is read from the markdown image's anchor, e.g. ![anchor](#) .
- {{FileName}}: name of the active file, without ".md" extension.
- {{DirName}}: name of the active file's parent folder name.
- {{DATE:$FORMAT}}: use "$FORMAT" to format the current date, "$FORMAT" must be a Moment.js format string, e.g. {{DATE:-YYYY-MM-DD}}. See [moment.js](https://momentjs.com/docs/#/displaying/format/)\`)
 
Here are some examples from pattern to image names (repeat in sequence), for image link ![tony](#), DirName="foo", fileName = "bar":
- {{DirName}}: foo, foo-1, foo-2
- {{FileName}}: bar, bar-1, bar-2
- {{Anchor}}: tony, tony-1, tony-2
- {{DirName}}_{{FileName}}_{{Anchor}}{{DATE:-YYYYMMDD}}: foo_bar_tony-20220508, foo_bar_tony-20220508-1, foo_bar_tony-20220508-2`
      ).addText((text) =>
      text
        .setValue(this.plugin.settings.namePattern)
        .onChange(async (value) => {
          this.plugin.settings.namePattern = value;
          await this.plugin.saveSettings();
        })
    );


  }
}

