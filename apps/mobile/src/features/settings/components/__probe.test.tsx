import { fireEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';
import { Button } from '@/shared/ui/Button';

function ProbeA() {
  const [draft, setDraft] = useState(0);
  return (
    <View>
      <Button label="done" onPress={() => undefined} testID="done" />
      <Button label="bump" onPress={() => setDraft(1)} testID={`bump-${draft}`} />
    </View>
  );
}

it('A1: plain stateful render', async () => {
  const view = await renderUi(<ProbeA />);
  expect(view.getByTestId('done')).toBeOnTheScreen();
});

it('A2: press re-renders with new state', async () => {
  const view = await renderUi(<ProbeA />);
  fireEvent.press(view.getByTestId('bump-0'));
  expect(await view.findByTestId('bump-1')).toBeOnTheScreen();
});
