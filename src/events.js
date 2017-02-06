'use strict';

/**
 * Map event types to proper names and descriptions
 */
const eventMappings = {

  // Team settings
  team_rename: event => ({
    name: 'Team renamed',
    desc: `The team was renamed to ${event.name}`,
  }),

  team_domain_change: event => ({
    name: 'Team domain changed',
    desc: `The team domain was changed to ${event.domain} so the URL is now ${event.url}`,
  }),

  email_domain_changed: event => ({
    name: 'Team email domain changed',
    desc: `The team email domain was changed to ${event.email_domain}`,
  }),


  // Channels
  channel_created: event => ({
    name: 'Channel created',
    desc: `<#${event.channel.id}|${event.channel.name}> was created by <@${event.channel.creator}>`,
  }),

  channel_deleted: event => ({
    name: 'Channel deleted',
    desc: `<#${event.channel}> was deleted`,
  }),

  channel_rename: event => ({
    name: 'Channel renamed',
    desc: `<#${event.channel.id}|${event.channel.name}> was renamed`,
  }),

  channel_archive: event => ({
    name: 'Channel archived',
    desc: `<#${event.channel}> was archived by <@${event.user}>`,
  }),

  channel_unarchive: event => ({
    name: 'Channel resurrected',
    desc: `<#${event.channel}> was un-archived by <@${event.user}>`,
  }),


  // Users
  team_join: event => {

    let userType;
    if (event.user.is_bot) userType = 'bot';
    else if (event.user.is_restricted) userType = 'guest';
    else if (event.user.is_ultra_restricted) userType = 'single channel guest';
    else userType = 'regular user';

    return {
      name: 'New user created',
      desc: `<@${event.user.id}> joined the team as a ${userType}`,
    };
  },

  user_change: event => ({
    name: 'User details updated',
    /**
     * To do:
     *  – Is the user now disabled?
     *  – Does the user have a profile picture?
     */
    desc: `<@${event.user.id}>’s details were updated`,
  }),


  // User groups
  subteam_created: event => ({
    name: 'New user group created',
    desc: `The user group <!subteam^${event.subteam.id}|${event.subteam.name}> with the description "${event.subteam.description}" was created by <@${event.subteam.created_by}>`,
  }),

  subteam_updated: event => ({
    name: 'User group updated',
    desc: `The user group <!subteam^${event.subteam.id}|${event.subteam.name}> was updated by <@${event.subteam.updated_by}>`,
  }),


  // Files
  file_comment_added: event => ({
    name: 'File comment added',
    desc: `A file comment was added by <@${event.comment.user}>`,
  }),

  file_comment_edited: event => ({
    name: 'File comment edited',
    desc: `A file comment was edited by <@${event.comment.user}>`,
  }),

  file_public: event => ({
    name: 'File made public',
    // This doesn't work
    desc: `The file <${event.file.permalink}|${event.file.title}> was made public`,
  }),


  // Emoji
  emoji_changed: event => {

    let name, desc;
    switch (event.subtype) {
      case 'add':
        name = 'Custom emoji added';
        desc = `A new custom emoji was created: :${event.name}:`
        break;
      case 'remove':
        if (event.names.length === 1) {
          name = 'Custom emoji removed';
          desc = `The custom emoji :${event.names[0]}: was removed`;
        } else {
          name = 'Custom emojis removed';
          desc = `The following custom emojis were removed: ${event.names[0].map(n => `:${n}:`).join(' ')}`;
        }
        break;
      default:
        name = 'Custom emoji event';
        desc = `Something happened with a custom emoji, but I'm not sure what. The event type was ${event.subtype}`
        break;        
    }

    return {
      name,
      desc,
    }
  },

};

module.exports = {
  eventMappings,
}
