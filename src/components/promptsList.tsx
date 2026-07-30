import {
  BulbOutlined,
  InfoCircleOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { Prompts, type PromptsItemType } from "@ant-design/x";
import React from "react";

const items = [
  {
    key: "1",
    icon: <BulbOutlined style={{ color: "#FFD700" }} />,
    label: "报事报修",
    prompt: "报事报修",
  },
  {
    key: "2",
    icon: <RocketOutlined style={{ color: "#722ED1" }} />,
    label: "停车费收费标准",
    prompt: "停车费收费标准",
  },
  {
    key: "3",
    icon: <InfoCircleOutlined style={{ color: "#1890FF" }} />,
    label: "我的工单处理进度",
    prompt: "我的工单处理进度",
  },
];

const PromptList: React.FC<{
  onItemClick: (data: PromptsItemType) => void;
}> = ({ onItemClick }) => {
  return (
    <Prompts
      rootClassName="quick-prompts"
      title="✨ 常用功能"
      items={items}
      onItemClick={(prompt) => onItemClick(prompt.data)}
    />
  );
};

export default PromptList;
