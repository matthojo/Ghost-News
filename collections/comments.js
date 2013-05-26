Comments = new Meteor.Collection('comments');

Meteor.methods({
  comment: function(postId, parentCommentId, text){
    var user = Meteor.user(),
        post=Posts.findOne(postId),
        postUser=Meteor.users.findOne(post.userId),
        timeSinceLastComment=timeSinceLast(user, Comments),
        cleanText= cleanUp(text),
        commentInterval = Math.abs(parseInt(getSetting('commentInterval',15))),
        properties={
          'commentAuthorId': user._id,
          'commentAuthorName': getDisplayName(user),
          'commentExcerpt': trimWords(stripMarkdown(cleanText),20),
          'postId': postId,
          'postHeadline' : post.headline
        },
        emails = user.emails,
        verified = false;

    for (var i = emails.length - 1; i >= 0; i--) {
      if(emails[i].verified){
        verified = true;
        break;
      }
    };

    // console.log(user);
    // check that user is verified
    if (!verified){
      throw new Meteor.Error(719, 'You need to verify your email address before you can comment');
    };

    // check that user can comment
    if (!user || !canComment(user))
      throw new Meteor.Error('You need to login or be invited to post new comments.');

    // check that user waits more than 15 seconds between comments
    if(!this.isSimulation && (timeSinceLastComment < commentInterval))
      throw new Meteor.Error(704, 'Please wait '+(commentInterval-timeSinceLastComment)+' seconds before commenting again');

    var comment = {
        post: postId,
        body: cleanText,
        userId: user._id,
        submitted: new Date().getTime(),
        author: getDisplayName(user)
    };

    if(parentCommentId)
      comment.parent = parentCommentId;

    var newCommentId=Comments.insert(comment);

    Posts.update(postId, {$inc: {comments: 1}});

    Meteor.call('upvoteComment', newCommentId);

    properties.commentId = newCommentId;

    if(!this.isSimulation){
      if(parentCommentId){
        // child comment
        var parentComment=Comments.findOne(parentCommentId);
        var parentUser=Meteor.users.findOne(parentComment.userId);

        properties.parentCommentId = parentCommentId;
        properties.parentAuthorId = parentComment.userId;
        properties.parentAuthorName = getDisplayName(parentUser);

        // do not notify users of their own actions (i.e. they're replying to themselves)
        if(parentUser._id != user._id)
          Meteor.call('createNotification','newReply', properties, parentUser, user);

        // if the original poster is different from the author of the parent comment, notify them too
        if(postUser._id != user._id && parentComment.userId != post.userId)
          Meteor.call('createNotification','newComment', properties, postUser, user);

      }else{
        // root comment
        // don't notify users of their own comments
        if(postUser._id != user._id)
          Meteor.call('createNotification','newComment', properties, postUser, Meteor.user());
      }
    }
    return properties;
  },
  removeComment: function(commentId){
    var comment=Comments.findOne(commentId);
    // decrement post comment count
    Posts.update(comment.post, {$inc: {comments: -1}});
    // note: should we also decrease user's comment karma ?
    Comments.remove(commentId);
  }
});
