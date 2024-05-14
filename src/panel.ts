import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { ICON_NAME, IConfig, VIEW_TYPE } from "./config";


export default class ImageStoreView extends ItemView {
  private settings: IConfig;
  private cacheContent: string;

  constructor(leaf: WorkspaceLeaf, settings: IConfig) {
    super(leaf);
    this.settings = settings;
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Day Planner Timeline";
  }

  getIcon() {
    return ICON_NAME;
  }


  // positionFromTime(time: Date) {
  //   return moment.duration(moment(time).format('HH:mm')).asMinutes()*this.settings.timelineZoomLevel;
  // }


  async analyze(activeFile: TFile): Promise<any> {
    console.log(`analyze ${activeFile.basename}`);
    try {

    } catch (error) {
      console.log(error);
    }
  }


  async onOpen() {
    // this.dailyView = new DailyView({
    //     target: (this as any).contentEl,
    //     props: {
    //       rootEl: this.containerEl.children[1]
    //     }
    //   });

    // this.schedule = new Schedule({
    //   target: (this as any).contentEl,
    //   props: {
    //     rootEl: this.containerEl.children[1]
    //   }
    // });
  }


}


