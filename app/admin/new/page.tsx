import TopicBuilder from "@/components/builder/TopicBuilder";
import { saveTopic } from "../actions";

export default function NewTopicPage() {
  return (
    <TopicBuilder
      mode="create"
      submissionCount={0}
      action={saveTopic.bind(null, null)}
    />
  );
}
