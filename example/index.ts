/**
 * Demo
 */
Component({
  /**
   * custom properties
   */
  name: "Demo",
  properties: {
    /**
     * @property list
     * @description 列表数据
     * @requires
     * @type IListVO {@link ./__interface__/vo.d.ts}
     */
    list: {
      type: Array,
      value: [] as IListVO,
    },
  },
  method: {
    init() {
      /**
       * @event onReady
       *
       * @description 初始化完成事件
       *
       * @detail IReadyDetail {@link ./__interface__/event.d.ts}
       */
      this.triggerEvent<IReadyDetail>("onReady", {
        isInit: true,
      });
    },
  },
});
