Lockouts = new Meteor.Collection("lockouts");

function searchByUserId(id) {
  return Meteor.users.find({_id: id}).fetch();
};

if (Meteor.isClient) {
  Meteor.subscribe('userData');
  Meteor.subscribe('lockoutData');
  Meteor.autorun(function() {
    Meteor.subscribe('requestorById', Session.get('requestorId'));
    Meteor.subscribe('responderById', Session.get('responderId'));
    Meteor.subscribe('lockoutById', Session.get('lockoutId'));
  });

  Template.lockedOutMain.request = function() {
    if(Lockouts.find({closedAt: null}, {}).fetch().length) {
      var lockout = Lockouts.findOne({closedAt: null}, {closedAt: null});
      console.log('new request: ', lockout);
      Session.set('requestorId', lockout.requestorId);
      Session.set('responderId', lockout.responderId);
      Session.set('lockoutId', lockout._id);
      Session.set('createdAt', lockout.createdAt);
      return lockout._id;
    } else {
      Session.set('requestorId', '');
      Session.set('responderId', '');
      Session.set('lockoutId', '');
      Session.set('createdAt', '');
      return false;
    }
  };

  Template.lockedOutMain.requestor = function() {
    if(Meteor.users.find({_id: Session.get('requestorId')}).fetch().length)
      return Meteor.users.findOne({_id: Session.get('requestorId')}).services.github.username ||
             Meteor.users.findOne({_id: Session.get('requestorId')}).profile.name;
    else
      return false;
  };

  Template.lockedOutMain.responder = function() {
    if(Meteor.users.find({_id: Session.get('responderId')}).fetch().length)
      return Meteor.users.findOne({_id: Session.get('responderId')}).services.github.username ||
             Meteor.users.findOne({_id: Session.get('responderId')}).profile.name;
    else
      return false;
  };

  Template.lockedOutMain.lockoutEntries = function () {
    return Lockouts.find({}, { sort: { createdAt: -1 } });
  };

  Template.lockedOutHistoryEntry.formatTime = function(time) {
    if(time) return moment(time).format('MM-DD-YYYY hh:mm:ss');
    else return;
  };

  Template.lockedOutMain.events({
    'click button.request' : function () {
        console.log("Request submitted");
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
    'click button.respond' : function () {
      console.log("Request claimed");
      if(Meteor.user()) {
        var lockoutId = Session.get('lockoutId');
        Lockouts.update(
          { _id: Session.get('lockoutId') },
          {
            $set: {
              claimedAt: new Date(),
              responderId: Meteor.user()._id,
              responderName: Meteor.user().services.github.username
            }
          }
        );
        setTimeout(function() {
          Lockouts.update(
            { _id: lockoutId },
            { $set: { closedAt: new Date() } }
          );
        }, 5000);
      }
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {

    Meteor.publish('userData', function () {
      return Meteor.users.find({_id: this.userId}, {fields: {'services': 1, 'resumes': 1}});
    });

    Meteor.publish('lockoutData', function() {
      return Lockouts.find({}, {
        sort: {
          createdAt: -1
        },
        fields: {
          'requestorName': 1,
          'responderName': 1,
          'createdAt': 1,
          'claimedAt': 1,
          'closedAt': 1
        }
      });
    });

    Meteor.publish('lockoutById', function(id) {
      return Lockouts.find({_id: id}, {
        fields: {
          'requestorId': 1,
          'responderId': 1,
          'requestorName': 1,
          'responderName': 1,
          'createdAt': 1,
          'claimedAt': 1,
          'closedAt': 1,
          '_id': 1
        }
      });
    });

    Meteor.publish('requestorById', function(id) {
      return Meteor.users.find({_id: id}, {fields: {'services': 1, 'resumes': 1}});
    });

    Meteor.publish('responderById', function(id) {
      return Meteor.users.find({_id: id}, {fields: {'services': 1, 'resumes': 1}});
    });

    Meteor.methods({
      clear: function() {
        Lockouts.remove({});
      }
    });
  });
}
