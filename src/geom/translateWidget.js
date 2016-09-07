import cone from './cone';
import quad from './quad';
import transform from './transform';
import combine from './combine';
export default function translateWidget() {
  // Create single 'arrow' first
  let arrow = combine([transform(cone(8), {
    aPosition: [
      0, 0, 1/16, 0,
      1/8, 0, 0, 0,
      0, 1/16, 0, 0,
      7/8, 0, 0, 1
    ]
  }), transform(quad(), {
    aPosition: [
      3/8, 0, 0, 0,
      0, 1/360, 0, 0,
      0, 0, 1/360, 0,
      3/8, 0, 0, 1
    ]
  }), transform(quad(), {
    aPosition: [
      0, 0, 1/360, 0,
      3/8, 0, 0, 0,
      0, 1/360, 0, 0,
      3/8, 0, 0, 1
    ]
  })]);
  return combine([transform(arrow, {
    aColor: [1, 0, 0]
  }), transform(arrow, {
    aColor: [0, 1, 0],
    aPosition: [
      0, 1, 0, 0,
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 0, 0, 1
    ]
  }), transform(arrow, {
    aColor: [0, 0, 1],
    aPosition: [
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 0, 1
    ]
  })]);
}
