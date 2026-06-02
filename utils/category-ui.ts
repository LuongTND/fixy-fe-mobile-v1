import { MaterialIcons } from '@expo/vector-icons';

export function getWorkerCategoryIcon(catId?: string): keyof typeof MaterialIcons.glyphMap {
  switch (catId) {
    case 'dien':
      return 'electrical-services';
    case 'nuoc':
      return 'plumbing';
    case 'dieuhoa':
      return 'ac-unit';
    default:
      return 'build';
  }
}
