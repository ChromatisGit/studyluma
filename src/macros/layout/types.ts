export type LayoutName = "default" | "statement" | "code" | "section";

export type LayoutMacro = {
  type: "layout";
  name: LayoutName;
};
