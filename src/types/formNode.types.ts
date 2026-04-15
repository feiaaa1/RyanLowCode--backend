// FormNode type definitions matching frontend structure
export interface ConfigPanelItem {
  prop: string;
  defaultValue: any;
  label: string;
  type: string;
  options?: Array<{ label: string; value: any }>;
  validate?: any;
}

export type ConfigPanelList = Record<string, ConfigPanelItem[]>;

export interface FormNode {
  id: string;
  name: string;
  type: string;
  nodeType: string | string[];
  configs: {
    props?: Record<string, any>;
    validate?: Record<string, any>;
    style?: Record<string, any>;
  };
  configPanelList: ConfigPanelList;
  childrens?: FormNode[];
}

export interface FormNodeTemplate {
  nodeType: string | string[];
  name: string;
  type: string;
  configs: Record<string, any>;
  configPanelList: ConfigPanelList;
  childrens?: FormNodeTemplate[];
}
