import type { ListedPostVo } from "../api/types";

type PostDetailProps = {
  post: ListedPostVo;
  handleClose: () => void;
};

export default function PostDetail(props: PostDetailProps) {
  const { post, handleClose } = props;
  return <text> 文章详情页: {post.spec?.title || "无标题"} </text>;
}
