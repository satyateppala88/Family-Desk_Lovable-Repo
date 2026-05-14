import { useNavigate } from "react-router-dom";
import { Onboarding } from "@/components/launch/Onboarding";

const Welcome = () => {
  const navigate = useNavigate();
  return <Onboarding onFinish={() => navigate(-1)} />;
};

export default Welcome;