import { Card, CardContent, CardHeader } from "@shared/components";
import { truncateText } from "@shared/utils";

interface PostItemProps {
  title: string;
  body: string;
}

export default function PostItem({ title, body }: PostItemProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader>{title}</CardHeader>
      <CardContent className="text-teal-800">
        {truncateText(body, 100)}
      </CardContent>
    </Card>
  );
}
