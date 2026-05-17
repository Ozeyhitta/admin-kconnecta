import { Edit } from "@/components/admin/edit";
import { SimpleForm } from "@/components/admin/simple-form";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";

const statusChoices = [
  { id: "ACTIVE",   name: "Hoạt động" },
  { id: "INACTIVE", name: "Không hoạt động" },
  { id: "LOCKED",   name: "Khoá tài khoản" },
];

const roleChoices = [
  { id: "USER",  name: "User" },
  { id: "ADMIN", name: "Admin" },
];

export const CustomerEdit = () => (
  <Edit>
    <SimpleForm>
      <SelectInput source="status" label="Trạng thái" choices={statusChoices} />
      <SelectInput source="role"   label="Vai trò"    choices={roleChoices} />
      <TextInput
        source="newPassword"
        label="Mật khẩu mới (để trống nếu không đổi)"
        type="password"
        helperText="Tối thiểu 6 ký tự"
      />
    </SimpleForm>
  </Edit>
);
