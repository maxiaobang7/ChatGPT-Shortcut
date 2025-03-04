import React, { useContext, useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import { message, Tooltip, Button } from "antd";
import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import copy from "copy-text-to-clipboard";
import { LinkOutlined, CopyOutlined, HeartOutlined, HeartTwoTone } from "@ant-design/icons";
import { Tags, TagList, type TagType, type Tag } from "@site/src/data/tags";
import { sortBy } from "@site/src/utils/jsUtils";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";
import { updateCopyCount, createFavorite, updateFavorite } from "@site/src/api";
import { AuthContext } from "../AuthContext";

import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

const TagComp = React.forwardRef<HTMLLIElement, Tag>(({ label, color, description }, ref) => (
  <li ref={ref} className={styles.tag} title={description}>
    <span className={styles.textLabel}>{label.toLowerCase()}</span>
    <span className={styles.colorLabel} style={{ backgroundColor: color }} />
  </li>
));

function ShowcaseCardTag({ tags }: { tags: TagType[] }) {
  const tagObjects = tags.map((tag) => ({ tag, ...Tags[tag] }));

  // Keep same order for all tags
  const tagObjectsSorted = sortBy(tagObjects, (tagObject) => TagList.indexOf(tagObject.tag));

  return (
    <>
      {tagObjectsSorted.map((tagObject, index) => {
        const id = `showcase_card_tag_${tagObject.tag}`;

        return (
          <Tooltip key={index} title={tagObject.description} id={id}>
            <TagComp key={index} {...tagObject} />
          </Tooltip>
        );
      })}
    </>
  );
}

function ShowcaseCard({ user, isDescription, copyCount, onCopy, onLove }) {
  const { userAuth, refreshUserAuth } = useContext(AuthContext);

  const { i18n } = useDocusaurusContext();
  const currentLanguage = i18n.currentLocale.split("-")[0];
  const userTitle = user[currentLanguage].title;
  const userRemark = user[currentLanguage].remark;

  const [paragraphText, setParagraphText] = useState(isDescription ? user[currentLanguage].prompt : user[currentLanguage].description);

  useEffect(() => {
    setParagraphText(isDescription ? user[currentLanguage].prompt : user[currentLanguage].description);
  }, [isDescription, user[currentLanguage].prompt, user[currentLanguage].description]);

  // 点击显示母语
  function handleParagraphClick() {
    if (paragraphText === user[currentLanguage].prompt) {
      setParagraphText(user[currentLanguage].description);
    } else {
      setParagraphText(user[currentLanguage].prompt);
    }
  }
  const userDescription = currentLanguage === "en" ? user.en.prompt : paragraphText;

  //const image = getCardImage(user);
  // 复制
  const [copied, setShowCopied] = useState(false);
  // 将显示数据单位简化到 k
  const formatCopyCount = (count) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + "k";
    }
    return count;
  };

  const handleCopyClick = useCallback(async () => {
    try {
      if (user[currentLanguage].prompt) {
        copy(userDescription);
      }
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
      onCopy(user.id);
      await updateCopyCount(user.id);
      // Notify parent component to update the copy count
    } catch (error) {
      console.error("Error updating copy count:", error);
    }
  }, [user.id]);

  const handleLove = useCallback(async () => {
    try {
      let userLoves;
      let favoriteId;

      if (!userAuth.data.favorites) {
        const createFavoriteResponse = await createFavorite([user.id]);
        userLoves = [user.id];
        favoriteId = createFavoriteResponse.data.id;
      } else {
        userLoves = userAuth.data.favorites.loves || [];
        favoriteId = userAuth.data.favorites.id;

        if (!userLoves.includes(user.id)) {
          userLoves.push(user.id);
          message.success("Added to favorites successfully!");
        }
      }

      await updateFavorite(favoriteId, userLoves);
      onLove(userLoves);
      refreshUserAuth();
    } catch (err) {
      console.error(err);
    }
  }, [user.id, onLove, userAuth, refreshUserAuth]);

  const removeFavorite = useCallback(async () => {
    try {
      if (userAuth.data.favorites) {
        let userLoves;
        let favoriteId;
        userLoves = userAuth.data.favorites.loves || [];
        favoriteId = userAuth.data.favorites.id;

        const index = userLoves.indexOf(user.id);
        if (index > -1) {
          userLoves.splice(index, 1);
          message.success("Removed from favorites successfully!");
        }

        await updateFavorite(favoriteId, userLoves);
        onLove(userLoves);
        refreshUserAuth();
      }
    } catch (err) {
      console.error(err);
    }
  }, [user.id, onLove, userAuth, refreshUserAuth]);

  return (
    <li key={userTitle} className="card shadow--md">
      <div className={clsx("card__body")}>
        <div className={clsx(styles.showcaseCardHeader)}>
          <Heading as="h4" className={styles.showcaseCardTitle}>
            <Link href={"/prompt/" + user.id} className={styles.showcaseCardLink}>
              {userTitle}{" "}
            </Link>
            <span className={styles.showcaseCardBody}>{copyCount > 0 && `🔥${formatCopyCount(copyCount)}`}</span>
          </Heading>
          <Button.Group>
            {userAuth && (
              <Tooltip title={user.tags.includes("favorite") ? <Translate>点击移除收藏</Translate> : translate({ message: "收藏" })}>
                <Button type="default" onClick={user.tags.includes("favorite") ? removeFavorite : handleLove}>
                  {user.tags.includes("favorite") ? <HeartTwoTone twoToneColor="#eb2f96" /> : <HeartOutlined />}
                </Button>
              </Tooltip>
            )}
            {!userAuth && user.tags.includes("favorite") && (
              <Button type="text" disabled>
                <HeartTwoTone twoToneColor="#eb2f96" />
              </Button>
            )}
            <Tooltip title={translate({ id: "copy.button", message: "复制" })}>
              <Button type="default" onClick={handleCopyClick}>
                <CopyOutlined />
                {copied && <Translate id="theme.CodeBlock.copied">已复制</Translate>}
              </Button>
            </Tooltip>
          </Button.Group>
        </div>
        <p className={styles.showcaseCardBody}>👉 {userRemark}</p>
        <p onClick={handleParagraphClick} className={styles.showcaseCardBody} style={{ cursor: "pointer" }}>
          {userDescription}
        </p>
      </div>
      <ul className={clsx("card__footer", styles.cardFooter)} style={{ listStyle: "none" }}>
        <ShowcaseCardTag tags={user.tags} />
        {user.website ? (
          <li style={{ marginLeft: "auto" }}>
            <a href={user.website} target="_blank" rel="noopener noreferrer">
              <LinkOutlined />
            </a>
          </li>
        ) : null}
      </ul>
    </li>
  );
}

export default React.memo(ShowcaseCard);
