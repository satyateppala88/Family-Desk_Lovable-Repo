import { useIdleAutoLock } from "@/hooks/useIdleAutoLock";

export const IdleAutoLockRunner = () => {
  useIdleAutoLock();
  return null;
};