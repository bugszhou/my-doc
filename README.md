# my-doc

文档生成器

## 注释关键词说明

- @property 标识为属性
- @description 描述
- @requires 是否必填
- @type 属性类型
- @link 文件路径
- @event 标识为事件
- @detail 事件返回值类型名

## 小程序组件注释声明

### 属性

```ts
Component({
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
});
```

### 事件

```ts
Component({
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
```
