import { EconomyModel } from './EconomyModel';
import { NetworkModel } from './NetworkModel';
import { PassengerSimulation } from './PassengerSimulation';

export class NetworkMetrics {
  private economy=new EconomyModel();
  constructor(private network:NetworkModel,private passengers:PassengerSimulation){}

  snapshot(){
    const transferCount=0;
    return {
      budgetM:this.network.budgetM,
      delivered:this.passengers.delivered,
      satisfaction:this.passengers.satisfaction,
      averageWait:this.passengers.averageWait,
      projectedAnnualNetM:this.economy.projectedAnnualNetM(
        this.passengers.delivered,
        this.network.lines,
        this.network.trains.length,
        transferCount
      )
    };
  }
}
