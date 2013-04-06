Lockouts = new Meteor.Collection("lockouts");

Meteor.startup(function () {

  // Sync only current logged in user's data to client
  Meteor.publish('userData', function () {
    return Meteor.users.find({_id: this.userId}, {fields: {'services': 1, 'resumes': 1}});
  });

  // Sync all lockout historical data to client
  Meteor.publish('lockoutData', function() {
    return Lockouts.find({}, {
      sort: {
        createdAt: -1
      },
      fields: {
        'requestorName': 1,
        'claimerName': 1,
        'createdAt': 1,
        'claimedAt': 1,
        'closedAt': 1
      }
    });
  });

  Meteor.methods({

    /** NOTE: This method is used to quickly clear out the database **/
    clear: function() {
      Lockouts.remove({});
    },
    closeAllLockouts: function(id) {
      // Adjust timeout time here (default: 60 seconds)
      var timeout = 5000;
      Meteor.setTimeout(function() {
        Lockouts.update(
          { closedAt: null },
          { $set: { closedAt: new Date() } },
          { multi: true }
        );
      }, timeout);
    }
  });
});
