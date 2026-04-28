import { useNavigate } from "react-router-dom";
import { FeatureTour } from "@/components/launch/featureTour/FeatureTour";

const Welcome = () => {
  const navigate = useNavigate();
  return <FeatureTour onFinish={() => navigate(-1)} />;
};

export default Welcome;