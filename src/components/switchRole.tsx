import { DownOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Drawer, Radio, Flex, message } from "antd";
import { useMemo, useState } from "react";

type Role = "user" | "admin";

type SwitchRoleProps = {
  defaultRole?: Role;
  onRoleChange?: (role: Role) => void;
  buttonLabel?: string;
};

const roleOptions: Array<{
  value: Role;
  label: string;
  session: string;
}> = [
  { value: "user", label: "业主", session: "" },
  { value: "admin", label: "物业", session: "" },
];

const SwitchRole = ({
  defaultRole = "user",
  onRoleChange,
}: SwitchRoleProps) => {
  const [role, setRole] = useState<Role>(defaultRole);
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSelect = (e: any) => {
    const nextRole = e.target.value;
    if (nextRole !== role) {
      setRole(nextRole);
      onRoleChange?.(nextRole);
      message.success(`你已切换角色为`)
    }
    setOpen(false);
  };

  const roleLabel = useMemo(() => {
    return roleOptions.find((d) => d.value === role)?.label;
  }, [role]);

  return (
    <>
      <Button
        type="text"
        className="role-switch-trigger"
        icon={<UserOutlined />}
        onClick={handleOpen}
      >
        {roleLabel}
      </Button>

      <Drawer
        open={open}
        placement="bottom"
        onClose={handleClose}
        title="切换角色"
        className="role-switch-drawer"
        closeIcon={false}
        height={140}
      >
        <Radio.Group
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginLeft:10
          }}
          value={role}
          options={roleOptions}
          onChange={handleSelect}
        />
      </Drawer>
    </>
  );
};

export default SwitchRole;
