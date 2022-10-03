const PATTERN = /^(.+)\s*<(.+)>$/;

module.exports = function author(str) {
  let result;

  const match = PATTERN.exec(str);
  if (match) {
    result = '<a class="author" href="' + match[2] + '">' + match[1] + '</a>';
  } else {
    result = '<span class="author">' + str + '</span>';
  }

  return result;
};