import { TestBed, async } from '@angular/core/testing';
import { <%= name %>Component } from './<%= name %>.component';

describe('<%= name %>Component', () => {

  let fixture = TestBed.createComponent(<%= name %>Component);
  let component = fixture.debugElement.componentInstance;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        <%= name %>Component
      ],
    }).compileComponents();
  }));
  it('should create the component', async(() => {
    expect(component).toBeTruthy();
  }));
});
