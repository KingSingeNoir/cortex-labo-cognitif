import p01 from './explications/part-01.json';
import p02 from './explications/part-02.json';
import p03 from './explications/part-03.json';
import p04 from './explications/part-04.json';
import p05 from './explications/part-05.json';
import p06 from './explications/part-06.json';
import p07 from './explications/part-07.json';
import p08 from './explications/part-08.json';
import p09 from './explications/part-09.json';
import p10 from './explications/part-10.json';

const SEED = {
  132: [
    'Le piège de cette énigme est de croire que chaque phrase ajoute de nouveaux chats. En réalité, toutes les phrases décrivent les mêmes quatre animaux, vus depuis des places différentes.',
    'Imaginez-vous à la place d’un des chats, assis dans un coin de la pièce et tourné vers le centre. Le coin voisin d’un côté est à votre droite, le coin voisin de l’autre côté est à votre gauche, et le coin opposé, en diagonale, est en face de vous. Or chacun de ces coins est déjà occupé par un chat.',
    'Faites le même raisonnement pour chacun des quatre chats : chacun voit un chat à sa droite, un à sa gauche et un en face, sans qu’il soit nécessaire d’en ajouter un seul.',
    'À retenir : avant de compter, demandez-vous si une nouvelle phrase parle vraiment de nouveaux objets ou simplement des mêmes objets décrits autrement. Il y a donc quatre chats en tout.',
  ],
  185: [
    'Commençons par comprendre ce que signifie « 4 contre 1 ». Si vous misez une somme sur Acorn et qu’il gagne, le bookmaker vous verse quatre fois votre mise. En revanche, l’argent misé sur les deux autres chevaux est perdu. L’exemple de l’énoncé le confirme : avec 5 £ sur chaque cheval, une victoire d’Acorn rapporte 4 × 5 = 20 £, moins les 5 + 5 = 10 £ perdus, soit 10 £ de gain.',
    'Appelons a, b et c les mises sur Acorn, Bluebottle et Capsule, et T leur total : T = a + b + c. Si Acorn gagne, vous touchez 4a et vous perdez les deux autres mises, c’est-à-dire T − a. Votre gain vaut donc 4a − (T − a) = 5a − T. De la même façon, une victoire de Bluebottle rapporte 4b − T, et une victoire de Capsule rapporte 3c − T.',
    'On veut gagner 13 £ quel que soit le vainqueur. Il faut donc que 5a − T, 4b − T et 3c − T valent tous 13. Autrement dit, 5a, 4b et 3c doivent être égaux au même nombre, T + 13. Appelons ce nombre k : alors a = k ÷ 5, b = k ÷ 4 et c = k ÷ 3.',
    'Additionnons les trois mises : T = k ÷ 5 + k ÷ 4 + k ÷ 3. En mettant tout sur 60, on obtient T = 47k ÷ 60. Or T = k − 13. On a donc k − 13 = 47k ÷ 60, ce qui donne k = 60.',
    'Il ne reste qu’à diviser : 12 £ sur Acorn, 15 £ sur Bluebottle et 20 £ sur Capsule, pour un total de 47 £. Dans les trois cas, le gain est bien de 13 £. Le piège : miser la même somme partout ne fonctionne pas, car les chevaux ne rapportent pas autant.',
  ],
};

/** Explications pas à pas, rédigées à partir des corrigés officiels (texte original). */
export const EXPLANATIONS = Object.assign({}, p01, p02, p03, p04, p05, p06, p07, p08, p09, p10, SEED);
