Template.post_page.helpers({
	post: function(){
		var post = Posts.findOne(Session.get('selectedPostId'));
		return post;
	},
	body_formatted: function(){
		var converter = new Markdown.Converter();
		var html_body=converter.makeHtml(this.body);
		return html_body.autoLink();
	},
	canComment: function(){
		return canComment(Meteor.user());
	},
	canView: function(){
		return canView(Meteor.user());
	},
	isNotVerified: function() {
		var user = Meteor.user(),
		    emails = user.emails,
		    verified = false;

		for (var i = emails.length - 1; i >= 0; i--) {
		  if(emails[i].verified){
		    verified = true;
		    break;
		  }
		};
		return !verified;
	}
});

Template.post_page.rendered = function(){
	if((scrollToCommentId=Session.get('scrollToCommentId')) && !this.rendered && $('#'+scrollToCommentId).exists()){
		scrollPageTo('#'+scrollToCommentId);
		Session.set('scrollToCommentId', null);
		this.rendered=true;
	}
}