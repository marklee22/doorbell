Lockouts = new Meteor.Collection("lockouts");

Meteor.subscribe('userData');
Meteor.subscribe('lockoutData');

// Returns the lockout request (if any)
Template.lockedOutMain.request = function() {

  // Find the first lockout request that hasn't been closed
  if(Lockouts.findOne({closedAt: null})) {
    var lockout = Lockouts.findOne({closedAt: null}, {closedAt: null});
    Session.set('lockoutId', lockout._id);
    return lockout._id;
  } else {
    // Clear out the session variables
    Session.set('lockoutId', '');
    return false;
  }
};

// Returns boolean whether the request was claimed or not
Template.lockedOutMain.claimed = function() {
  if(Lockouts.findOne({_id: Session.get('lockoutId')}).claimerName)
    return true;
  else
    return false;
}

// Returns the title of the request
Template.lockedOutMain.requestMessage = function() {
  if(Session.get('lockoutId')) {
    var lockout = Lockouts.findOne({_id: Session.get('lockoutId')});

    // Request has been claimed
    if(lockout.claimerName && lockout.claimerName === lockout.requestorName)
      return lockout.claimerName + ' has cancelled his/her request!';
    else if(lockout.claimerName)
      return lockout.claimerName + ' has claimed the request!';
    else if(lockout.requestorName === Meteor.user().services.github.username)
      return 'Awaiting for someone to claim your request';
    else if(lockout)
      return lockout.requestorName + ' is locked out!';
    else
      return '';
  }
  return '';
};

// Returns the button name for claiming a request
Template.lockedOutMain.claimMessage = function() {
  var lockout = Lockouts.findOne({_id: Session.get('lockoutId')});

  if(lockout.requestorName === Meteor.user().services.github.username)
    return 'Cancel';
  else
    return 'Claim';
};

// Returns CSS class to cross out cancelled requests
Template.lockedOutHistoryEntry.cancelled = function() {
  if(this.requestorName === this.claimerName) return 'cancelled'
  else return '';
}

// Returns all the historical lockout entries
Template.lockedOutMain.lockoutEntries = function () {
  return Lockouts.find({}, { sort: { createdAt: -1 } });
};

// Formats the time out of ISO format
Template.lockedOutHistoryEntry.formatTime = function(time) {
  if(time) return moment(time).format('MM/DD/YY hh:mm:ss');
  else return;
};

Template.lockedOutMain.events({

  // Create new lockout request (user is locked out) event binding
  'click button.request' : function () {

    // Play doorbell sound once
    var snd = new Audio('doorbell2.ogg');
    snd.play();

    if(Meteor.user()) {
      Lockouts.insert({
        createdAt: new Date(),
        claimedAt: null,
        closedAt: null,
        requestorId: Meteor.user()._id,
        requestorName: Meteor.user().services.github.username
      }, function(err, id) {
        Session.set('lockoutId', id);
      });
    }
  },

  // Claim lockout request (answer the door) event binding
  'click button.claim' : function () {
    if(Meteor.user()) {
      var lockoutId = Session.get('lockoutId');
      Lockouts.update(
        { _id: Session.get('lockoutId') },
        {
          $set: {
            claimedAt: new Date(),
            claimerId: Meteor.user()._id,
            claimerName: Meteor.user().services.github.username
          }
        }
      );

      // Set timeout on all lockout requests server side in case a user closes their browser
      Meteor.call('closeAllLockouts');
    }
  }
});
