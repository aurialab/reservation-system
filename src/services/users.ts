import {
  deleteUserById,
  findUserByEmail,
  findUserById,
  listUsers,
  type UpdateUserInput,
  updateUserById,
  updateUserBoStatus,
  type UserRecord
} from "../repositories/user";

export type PublicUser = Omit<UserRecord, "passwordHash">;

function toPublicUser(user: UserRecord): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function listAllUsers(): Promise<PublicUser[]> {
  const users = await listUsers();
  return users.map(toPublicUser);
}

export async function getUserById(
  userId: number
): Promise<PublicUser | null> {
  const user = await findUserById(userId);
  return user ? toPublicUser(user) : null;
}

export async function getUserByEmail(
  email: string
): Promise<PublicUser | null> {
  const user = await findUserByEmail(email);
  return user ? toPublicUser(user) : null;
}

export async function updateUser(
  userId: number,
  payload: UpdateUserInput
): Promise<PublicUser | null> {
  const user = await updateUserById(userId, payload);
  return user ? toPublicUser(user) : null;
}

export async function removeUser(userId: number): Promise<boolean> {
  return deleteUserById(userId);
}

export async function setUserBoStatus(
  userId: number,
  isBO: boolean
): Promise<PublicUser | null> {
  const user = await updateUserBoStatus(userId, isBO);
  return user ? toPublicUser(user) : null;
}
