import {
  BulbOutlined,
  InfoCircleOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { Prompts, type PromptsItemType } from '@ant-design/x';
import React from 'react';

const items = [
  {
    key: '1',
    icon: <BulbOutlined style={{ color: '#FFD700' }} />,
    label: '创建工单',
    prompt:'帮我创建工单'
  },
  {
    key: '2',
    icon: <InfoCircleOutlined style={{ color: '#1890FF' }} />,
    label: '访客预约',
    prompt:'访客预约'
  },
  {
    key: '3',
    icon: <RocketOutlined style={{ color: '#722ED1' }} />,
    label: '地铁站',
    prompt:'附近的地铁站'
  },
  {
    key: '4',
    icon: <RocketOutlined style={{ color: '#722ED1' }} />,
    label: '停车费',
     prompt:'停车费标准'
  },
];

const PromptList: React.FC<{onItemClick:(data: PromptsItemType) => void}> = ({onItemClick}) => {
  return (
      <Prompts
        rootClassName="quick-prompts"
        title="✨ 常用功能"
        items={items}
        onItemClick={(prompt)=>onItemClick(prompt.data)}
      />
  );
};

export default PromptList;
