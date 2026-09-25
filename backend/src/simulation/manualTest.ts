import { SimulatedSensorProvider } from '../providers/SimulatedSensorProvider';
import { triggerScenario } from './scenarios';

const provider = new SimulatedSensorProvider();

triggerScenario('ESP-001', 'FIRE', 2);

for (let index = 0; index < 10; index += 1) {
  console.log(provider.generateReading('ESP-001', 'Assembly Floor'));
}

