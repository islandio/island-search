// Functionality for indexing content for search.

var _ = require('underscore');
var redis = require('redis');
var stemmer = require('porter-stemmer').stemmer;
// Diacritics are signs such as accents. We'd like to remove them for
// indexing purposes
var removeDiacritics = require('diacritics').remove;

var stopWords = exports.stopWords = [
  "a", "a's", "able", "about", "above", "according", "accordingly", "across",
  "actually", "after", "afterwards", "again", "against", "ain't", "all",
  "allow", "allows", "almost", "alone", "along", "already", "also", "although",
  "always", "am", "among", "amongst", "an", "and", "another", "any", "anybody",
  "anyhow", "anyone", "anything", "anyway", "anyways", "anywhere", "apart",
  "appear", "appreciate", "appropriate", "are", "aren't", "around", "as",
  "aside", "ask", "asking", "associated", "at", "available", "away", "awfully",
  "b", "be", "became", "because", "become", "becomes", "becoming", "been",
  "before", "beforehand", "behind", "being", "believe", "below", "beside",
  "besides", "best", "better", "between", "beyond", "both", "brief", "but",
  "by", "c", "c'mon", "c's", "came", "can", "can't", "cannot", "cant", "cause",
  "causes", "certain", "certainly", "changes", "clearly", "co", "com", "come",
  "comes", "concerning", "consequently", "consider", "considering", "contain",
  "containing", "contains", "corresponding", "could", "couldn't", "course",
  "currently", "d", "definitely", "described", "despite", "did", "didn't",
  "different", "do", "does", "doesn't", "doing", "don't", "done", "down",
  "downwards", "during", "e", "each",  "edu", "eg", "eight", "either", "else",
  "elsewhere", "enough", "entirely", "especially", "et", "etc", "even", "ever",
  "every", "everybody", "everyone", "everything", "everywhere", "ex",
  "exactly", "example", "except", "f", "far", "few", "fifth", "first", "five",
  "followed", "following", "follows", "for", "former", "formerly", "forth",
  "four", "from", "further", "furthermore", "g", "get", "gets", "getting",
  "given", "gives", "go", "goes", "going", "gone", "got", "gotten",
  "greetings", "h", "had", "hadn't", "happens", "hardly", "has", "hasn't",
  "have", "haven't", "having", "he", "he's", "hello", "help", "hence", "her",
  "here", "here's", "hereafter", "hereby", "herein", "hereupon", "hers",
  "herself", "hi", "him", "himself", "his", "hither", "hopefully", "how",
  "howbeit", "however", "i", "i'd", "i'll", "i'm", "i've", "ie", "if",
  "ignored", "immediate", "in", "inasmuch", "inc", "indeed", "indicate",
  "indicated", "indicates", "inner", "insofar", "instead", "into", "inward",
  "is", "isn't", "it", "it'd", "it'll", "it's", "its", "itself", "j", "just",
  "k", "keep", "keeps", "kept", "know", "knows", "known", "l", "last",
  "lately", "later", "latter", "latterly", "least", "less", "lest", "let",
  "let's", "like", "liked", "likely", "little", "look", "looking", "looks",
  "ltd", "m", "mainly", "many", "may", "maybe", "me", "mean", "meanwhile",
  "merely", "might", "more", "moreover", "most", "mostly", "much", "must",
  "my", "myself", "n", "name", "namely", "nd", "near", "nearly", "necessary",
  "need", "needs", "neither", "never", "nevertheless", "new", "next", "nine",
  "no", "nobody", "non", "none", "noone", "nor", "normally", "not", "nothing",
  "novel", "now", "nowhere", "o", "obviously", "of", "off", "often", "oh",
  "ok", "okay", "old", "on", "once", "one", "ones", "only", "onto", "or",
  "other", "others", "otherwise", "ought", "our", "ours", "ourselves", "out",
  "outside", "over", "overall", "own", "p", "particular", "particularly",
  "per", "perhaps", "placed", "please", "plus", "possible", "presumably",
  "probably", "provides", "q", "que", "quite", "qv", "r", "rather", "rd", "re",
  "really", "reasonably", "regarding", "regardless", "regards", "relatively",
  "respectively", "right", "s", "said", "same", "saw", "say", "saying", "says",
  "second", "secondly", "see", "seeing", "seem", "seemed", "seeming", "seems",
  "seen", "self", "selves", "sensible", "sent", "serious", "seriously",
  "seven", "several", "shall", "she", "should", "shouldn't", "since", "six",
  "so", "some", "somebody", "somehow", "someone", "something", "sometime",
  "sometimes", "somewhat", "somewhere", "soon", "sorry", "specified",
  "specify", "specifying", "still", "sub", "such", "sup", "sure", "t", "t's",
  "take", "taken", "tell", "tends", "th", "than", "thank", "thanks", "thanx",
  "that", "that's", "thats", "the", "their", "theirs", "them", "themselves",
  "then", "thence", "there", "there's", "thereafter", "thereby", "therefore",
  "therein", "theres", "thereupon", "these", "they", "they'd", "they'll",
  "they're", "they've", "think", "third", "this", "thorough", "thoroughly",
  "those", "though", "three", "through", "throughout", "thru", "thus", "to",
  "together", "too", "took", "toward", "towards", "tried", "tries", "truly",
  "try", "trying", "twice", "two", "u", "un", "under", "unfortunately",
  "unless", "unlikely", "until", "unto", "up", "upon", "us", "use", "used",
  "useful", "uses", "using", "usually", "uucp", "v", "value", "various",
  "very", "via", "viz", "vs", "w", "want", "wants", "was", "wasn't", "way",
  "we", "we'd", "we'll", "we're", "we've", "welcome", "well", "went", "were",
  "weren't", "what", "what's", "whatever", "when", "whence", "whenever",
  "where", "where's", "whereafter", "whereas", "whereby", "wherein",
  "whereupon", "wherever", "whether", "which", "while", "whither", "who",
  "who's", "whoever", "whole", "whom", "whose", "why", "will", "willing",
  "wish", "with", "within", "without", "won't", "wonder", "would", "would",
  "wouldn't", "x", "y", "yes", "yet", "you", "you'd", "you'll", "you're",
  "you've", "your", "yours", "yourself", "yourselves", "z",
  "zero"];


var Search = exports.Search = function(opts, cb) {
  if (!opts.redisHost) {
    return cb('Invalid host');
  }

  // Redis connect.
  this.client = redis.createClient(opts.redisPort || 6379, opts.redisHost);
  this.client.on('error', function (err) {
    console.error(err)
  });
  cb(null, this);
};

/* Execute a redis lexical search */
Search.prototype.search = function(group, str, limit, cb) {
  if (_.isFunction(limit)) cb = limit;
  str = removeDiacritics(str.toLowerCase());
  // For single words, we use porter-stemmer
  if (str.indexOf(' ') === -1)
    str = stemmer(str);
  str = str.replace(/\W/g, '') // remove symbols
  var zrange = '[' + str;
  this.client.zrangebylex(
      group + '-search', zrange,
      // Don't know why the 0xFF works... saw in a gist but can't find docs
      zrange + String.fromCharCode(0xFF),
      'LIMIT', 0, limit,  cb);
};

/*
 * Index a document with redis.
 * For the given keys, we will index any words that are not stopwords.
 * Example: "The fox jumps over the lazy dog" will index fox, jumps, lazy and
 * dog for the given document.
 * We will also index "fox jumps over the lazy dog", "jumps over
 * the lazy dog", "over the lazy dog" etc.
 */

Search.prototype.index = function (group, doc, keys, options, cb) {
  var self = this;
  var indexed = 0;
  if (_.isFunction(options)) cb = options;
  cb = cb || function(){};
  if (keys.length === 0) return cb(null, 0);
  var _cb = _.after(keys.length, function() {
    return cb(null, indexed);
  });
  _.each(keys, function (k) {
    if (_.isArray(doc[k])) {
      var __cb = _.after(doc[k].length, _cb);
      _.each(doc[k], function (s) { _index(s, __cb); });
    } else _index(doc[k], _cb);
  });

  function _index(str, cb) {
    if (!_.isString(str)) return cb();
    var _str = str.split(' ');
    var count = _str.length;
    // Index individual words, stemming and removing diacritics
    var toIndex = _.chain(_str)
        .filter(function(s) { return stopWords.indexOf(s) === -1; })
        .map(function(s) { return stemmer(removeDiacritics(s.toLowerCase()));})
        .filter(function(s) { return s !== ''; })
        .value();
    // Add the whole string, dropping the first word, readding until non-left
    // Note that we index until (count - 1) because single words are covered
    // by the previous case
    for (var i = 0; i < count - 1 ; i++) {
      toIndex.push(removeDiacritics(str.toLowerCase()));
      str = str.substr(str.indexOf(' ') + 1);
    }
    indexed += toIndex.length;
    if (toIndex.length === 0) return cb(null, 0);
    var _cb = _.after(toIndex.length, cb);
    _.each(toIndex, function(s) {
      s = s.replace(/\W/g, '') // make sure characters are valid
      self.client.zadd(group + '-search', 0, s + '::' + doc._id, _cb);
    });

  }
};

/*
 * Remove group from cache.
 */
Search.prototype.del = function (group, cb) {
  this.client.del(group, cb);
};
