import { useState, useEffect } from 'react'
import './App.css'
import { db, auth, googleProvider } from './firebase'
import { collection, onSnapshot, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

interface Task {
  id: number;
  text: string;
  completed: boolean;
  date: string;
}

interface Provider {
  id: number;
  name: string;
  phone: string;
  address: string;
  observations: string;
}

interface Service {
  id: number;
  name: string;
  phone: string;
  address: string;
  observations: string;
}

interface Employee {
  id: number;
  name: string;
  role: string;
  phone: string;
  observations: string;
}


interface ScheduledReminder {
  id: number;
  date: string;
  text: string;
}

const getTodayStr = () => {
  const options = {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  } as const;
  return new Intl.DateTimeFormat('en-CA', options).format(new Date());
};

function App() {

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [isProviderListOpen, setIsProviderListOpen] = useState(false);
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', phone: '', address: '', observations: '' });
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [isServiceListOpen, setIsServiceListOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', phone: '', address: '', observations: '' });
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isEmployeeListOpen, setIsEmployeeListOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '', phone: '', observations: '' });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    id: 0,
    providerId: 0,
    orderDate: getTodayStr(),
    deliveryDate: '',
    orderDetails: '',
    observations: '',
    taskId: 0
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);

  const [isServiceRequestModalOpen, setIsServiceRequestModalOpen] = useState(false);
  const [newServiceRequest, setNewServiceRequest] = useState({
    id: 0,
    serviceId: 0,
    requestDate: getTodayStr(),
    executionDate: '',
    details: '',
    observations: '',
    taskId: 0
  });

  const [calls, setCalls] = useState<any[]>([]);
  const [scheduledReminders, setScheduledReminders] = useState<ScheduledReminder[]>([]);

  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);

  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [newCall, setNewCall] = useState({
    id: 0,
    employeeId: 0,
    callDate: getTodayStr(),
    reason: '',
    observations: '',
    taskId: 0
  });

  const [newReminderText, setNewReminderText] = useState('');
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);
  const [editingReminderText, setEditingReminderText] = useState('');

  // Manejo de Autenticación
  useEffect(() => {
    console.log("Iniciando escucha de autenticación...");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Firebase Auth State:", currentUser ? `Conectado como ${currentUser.email}` : "Desconectado");
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);


  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      alert("Hubo un error al iniciar sesión con Google.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Sincronización con Firebase
  useEffect(() => {
    if (!user) return;
    console.log("Usuario autenticado, iniciando sincronización...");

    const userRef = (collectionName: string) => collection(db, `users/${user.uid}/${collectionName}`);

    const unsubTasks = onSnapshot(userRef('tasks'), (snapshot) => {
      console.log("Tareas cargadas:", snapshot.size);
      const allTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.data().id || Number(doc.id) } as Task));
      setPendingTasks(allTasks.filter(t => !t.completed));
      setCompletedTasks(allTasks.filter(t => t.completed));
    }, error => console.error("Error tasks:", error));

    const unsubProviders = onSnapshot(userRef('providers'), (snapshot) => {
      console.log("Proveedores cargados:", snapshot.size);
      setProviders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.data().id || Number(doc.id) } as Provider)));
    }, error => alert("Error cargando proveedores: " + error.message));

    const unsubServices = onSnapshot(userRef('service_providers'), (snapshot) => {
      console.log("Servicios cargados:", snapshot.size);
      setServices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.data().id || Number(doc.id) } as Service)));
    }, error => console.error("Error services:", error));

    const unsubEmployees = onSnapshot(userRef('employees'), (snapshot) => {
      console.log("Empleados cargados:", snapshot.size);
      setEmployees(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.data().id || Number(doc.id) } as Employee)));
    }, error => console.error("Error employees:", error));

    const unsubOrders = onSnapshot(userRef('orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.data().id || Number(doc.id) })));
    }, error => console.error("Error orders:", error));

    const unsubServiceRequests = onSnapshot(userRef('service_requests'), (snapshot) => {
      setServiceRequests(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.data().id || Number(doc.id) })));
    }, error => console.error("Error requests:", error));

    const unsubCalls = onSnapshot(userRef('calls'), (snapshot) => {
      setCalls(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.data().id || Number(doc.id) })));
    }, error => console.error("Error calls:", error));

    const unsubReminders = onSnapshot(userRef('reminders'), (snapshot) => {
      setScheduledReminders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.data().id || Number(doc.id) } as ScheduledReminder)));
    }, error => console.error("Error reminders:", error));

    return () => {
      unsubTasks(); unsubProviders(); unsubServices(); unsubEmployees();
      unsubOrders(); unsubServiceRequests(); unsubCalls(); unsubReminders();
    }
  }, [user]);

  // Automation: Move reminders to tasks on their date
  useEffect(() => {
    const today = getTodayStr();
    const dueReminders = scheduledReminders.filter(r => r.date === today);

    if (dueReminders.length > 0) {
      const newTasks = dueReminders.map(r => ({
        id: Date.now() + Math.random(),
        text: r.text.toUpperCase(),
        completed: false,
        date: today
      }));
      setPendingTasks(prev => [...prev, ...newTasks]);
      setScheduledReminders(prev => prev.filter(r => r.date !== today));
    }
  }, [scheduledReminders]);

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setNewOrder(prev => ({ ...prev, orderDate: date }));
    setNewServiceRequest(prev => ({ ...prev, requestDate: date }));
    setNewCall(prev => ({ ...prev, callDate: date }));
    setIsDayModalOpen(true);
  };

  const getUserDoc = (collectionName: string, id: string | number) => {
    if (!user) throw new Error("User not authenticated");
    return doc(db, `users/${user.uid}/${collectionName}`, id.toString());
  };

  const addScheduledReminder = async () => {
    if (newReminderText.trim() && user) {
      const id = Date.now();
      await setDoc(getUserDoc('reminders', id), {
        date: selectedDate,
        text: newReminderText.trim().toUpperCase()
      });
      setNewReminderText('');
    }
  };

  const deleteReminder = async (id: number) => {
    if (confirm('¿DESEA ELIMINAR ESTE RECORDATORIO?') && user) {
      await deleteDoc(getUserDoc('reminders', id));
    }
  };

  const startEditReminder = (reminder: ScheduledReminder) => {
    setEditingReminderId(reminder.id);
    setEditingReminderText(reminder.text);
  };

  const saveEditReminder = async () => {
    if (editingReminderId && editingReminderText.trim() && user) {
      await updateDoc(getUserDoc('reminders', editingReminderId), {
        text: editingReminderText.trim().toUpperCase()
      });
      setEditingReminderId(null);
      setEditingReminderText('');
    }
  };

  const addTask = async () => {
    if (newTaskText.trim() && user) {
      const id = Date.now();
      await setDoc(getUserDoc('tasks', id), {
        text: newTaskText.trim().toUpperCase(),
        completed: false,
        date: getTodayStr()
      });
      setNewTaskText('');
    }
  };

  const deleteTask = async (id: number) => {
    if (confirm('¿DECEAS ELIMINAR ESTA TAREA?') && user) {
      await deleteDoc(getUserDoc('tasks', id));
    }
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const saveEditTask = async () => {
    if (editingTaskText.trim() && editingTaskId && user) {
      await updateDoc(getUserDoc('tasks', editingTaskId), {
        text: editingTaskText.trim().toUpperCase()
      });
      setEditingTaskId(null);
    }
  };

  const completeTask = async (id: number) => {
    if (!id || id === 0 || !user) return;
    await updateDoc(getUserDoc('tasks', id), {
      completed: true
    });
  };

  const toggleTask = async (id: number, currentCompleted: boolean) => {
    if (!user) return;
    await updateDoc(getUserDoc('tasks', id), {
      completed: !currentCompleted
    });
  };

  const addProvider = async () => {
    if (newProvider.name.trim() && user) {
      try {
        if (selectedProvider) {
          await updateDoc(getUserDoc('providers', selectedProvider.id), newProvider);
          setSelectedProvider(null);
        } else {
          const id = Date.now();
          await setDoc(getUserDoc('providers', id), { ...newProvider, id });
        }
        setIsAddProviderOpen(false);
        setNewProvider({ name: '', phone: '', address: '', observations: '' });
      } catch (error) {
        console.error("Error saving provider:", error);
      }
    }
  };

  const deleteProvider = async (id: number) => {
    if (confirm('¿DECEAS ELIMINAR ESTE PROVEEDOR?') && user) {
      try {
        await deleteDoc(getUserDoc('providers', id));
      } catch (error) {
        console.error("Error deleting provider:", error);
      }
    }
  };

  const openEditProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setNewProvider({
      name: provider.name,
      phone: provider.phone,
      address: provider.address,
      observations: provider.observations
    });
    setIsAddProviderOpen(true);
  };

  // Services Logic
  const addService = async () => {
    if (newService.name.trim() && user) {
      try {
        if (selectedService) {
          await updateDoc(getUserDoc('service_providers', selectedService.id), newService);
          setSelectedService(null);
        } else {
          const id = Date.now();
          await setDoc(getUserDoc('service_providers', id), { ...newService, id });
        }
        setIsAddServiceOpen(false);
        setNewService({ name: '', phone: '', address: '', observations: '' });
      } catch (error) {
        console.error("Error saving service:", error);
      }
    }
  };

  const deleteService = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar este servicio?') && user) {
      try {
        await deleteDoc(getUserDoc('service_providers', id));
      } catch (error) {
        console.error("Error deleting service:", error);
      }
    }
  };

  const openEditService = (service: Service) => {
    setSelectedService(service);
    setNewService({
      name: service.name,
      phone: service.phone,
      address: service.address,
      observations: service.observations
    });
    setIsAddServiceOpen(true);
  };

  const addEmployee = async () => {
    if (newEmployee.name.trim() && user) {
      try {
        if (selectedEmployee) {
          await updateDoc(getUserDoc('employees', selectedEmployee.id), newEmployee);
          setSelectedEmployee(null);
        } else {
          const id = Date.now();
          await setDoc(getUserDoc('employees', id), { ...newEmployee, id });
        }
        setIsAddEmployeeOpen(false);
        setNewEmployee({ name: '', role: '', phone: '', observations: '' });
      } catch (error) {
        console.error("Error saving employee:", error);
      }
    }
  };

  const deleteEmployee = async (id: number) => {
    if (confirm('¿DECEAS ELIMINAR ESTE EMPLEADO?') && user) {
      try {
        await deleteDoc(getUserDoc('employees', id));
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  const openEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewEmployee({
      name: employee.name,
      role: employee.role,
      phone: employee.phone,
      observations: employee.observations
    });
    setIsAddEmployeeOpen(true);
  };

  // Orders Logic
  const handleCreateOrder = async () => {
    if (newOrder.providerId !== 0 && newOrder.orderDetails.trim() && user) {
      const id = newOrder.id !== 0 ? newOrder.id : Date.now();
      await setDoc(getUserDoc('orders', id), { ...newOrder, id, type: 'order' });

      if (newOrder.taskId && newOrder.taskId !== 0) {
        completeTask(newOrder.taskId);
      }

      setIsOrderModalOpen(false);
      setNewOrder({
        id: 0,
        providerId: 0,
        orderDate: getTodayStr(),
        deliveryDate: '',
        orderDetails: '',
        observations: '',
        taskId: 0
      });
    } else {
      console.warn('Incomplete order data or user not logged in');
    }
  };

  const handleCreateServiceRequest = async () => {
    if (newServiceRequest.serviceId !== 0 && newServiceRequest.details.trim() && user) {
      const id = newServiceRequest.id !== 0 ? newServiceRequest.id : Date.now();
      await setDoc(getUserDoc('service_requests', id), { ...newServiceRequest, id, type: 'service' });

      if (newServiceRequest.taskId && newServiceRequest.taskId !== 0) {
        completeTask(newServiceRequest.taskId);
      }

      setIsServiceRequestModalOpen(false);
      setNewServiceRequest({
        id: 0,
        serviceId: 0,
        requestDate: getTodayStr(),
        executionDate: '',
        details: '',
        observations: '',
        taskId: 0
      });
    } else {
      console.warn('Incomplete service request data or user not logged in');
    }
  };

  const handleCreateCall = async () => {
    if (newCall.employeeId !== 0 && newCall.reason.trim() && user) {
      const id = newCall.id !== 0 ? newCall.id : Date.now();
      await setDoc(getUserDoc('calls', id), { ...newCall, id, type: 'call' });

      if (newCall.taskId && newCall.taskId !== 0) {
        completeTask(newCall.taskId);
      }

      setIsCallModalOpen(false);
      setNewCall({
        id: 0,
        employeeId: 0,
        callDate: getTodayStr(),
        reason: '',
        observations: '',
        taskId: 0
      });
    } else {
      console.warn('Incomplete call data or user not logged in');
    }
  };

  const handleDeleteAction = async (action: any) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este registro?') || !user) return;

    const collectionName =
      action.type === 'order' ? 'orders' :
        action.type === 'service' ? 'service_requests' :
          action.type === 'call' ? 'calls' : '';

    if (collectionName) {
      await deleteDoc(getUserDoc(collectionName, action.id));
    }
    setIsDetailModalOpen(false);
  };

  const handleEditAction = (action: any) => {
    setIsDetailModalOpen(false);
    if (action.type === 'order') {
      setNewOrder({ ...action, taskId: action.taskId || 0 });
      setIsOrderModalOpen(true);
    } else if (action.type === 'service') {
      setNewServiceRequest({ ...action, taskId: action.taskId || 0 });
      setIsServiceRequestModalOpen(true);
    } else if (action.type === 'call') {
      setNewCall({ ...action, taskId: action.taskId || 0 });
      setIsCallModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-gradient)' }}>
        <h2 style={{ color: 'var(--primary-navy)' }}>Cargando...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="card login-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="FerApp Logo" style={{ width: '180px', height: '180px', marginBottom: '2rem' }} />
          <h1 style={{ fontSize: '2.5rem', color: 'var(--primary-navy)', marginBottom: '1rem' }}>BIENVENIDO</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Gestiona tus tareas y servicios de forma profesional.</p>
          <button onClick={handleLogin} className="google-btn">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.6429 10.2272C19.6429 9.5539 19.5824 8.90617 19.4699 8.28409H10V12.0114H15.4058C15.1724 13.2727 14.4633 14.338 13.3981 15.0483V17.5199H16.6494C18.5523 15.7671 19.6429 13.179 19.6429 10.2272Z" fill="#4285F4" />
              <path d="M10 20C12.7 20 14.9659 19.1051 16.6494 17.5199L13.3981 15.0483C12.4972 15.6506 11.3523 16.0114 10 16.0114C7.39205 16.0114 5.18466 14.2528 4.39773 11.8892H1.05398V14.483C2.70455 17.7614 6.08807 20 10 20Z" fill="#34A853" />
              <path d="M4.39773 11.8892C4.19886 11.2926 4.08523 10.6562 4.08523 10C4.08523 9.34375 4.19886 8.70739 4.39773 8.1108V5.51705H1.05398C0.380682 6.86364 0 8.38921 0 10C0 11.6108 0.380682 13.1364 1.05398 14.483L4.39773 11.8892Z" fill="#FBBC05" />
              <path d="M10 3.98864C11.4716 3.98864 12.7926 4.49716 13.8324 5.4858L16.7188 2.59943C14.9659 0.988636 12.7 0 10 0C6.08807 0 2.70455 2.23864 1.05398 5.51705L4.39773 8.1108C5.18466 5.74716 7.39205 3.98864 10 3.98864Z" fill="#EA4335" />
            </svg>
            INICIAR SESIÓN CON GOOGLE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      {/* Sidebar Modules */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="FerApp Logo" style={{ width: '160px', height: '160px', objectFit: 'contain' }} />
          {user && (
            <div style={{
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--primary-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName?.toUpperCase() || 'USUARIO'}
              </span>
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#e63946',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          )}
        </div>
        <button className="btn-navy" onClick={() => setIsProviderListOpen(true)}>Proveedores</button>
        <button className="btn-orange" onClick={() => setIsServiceListOpen(true)}>Servicios</button>
        <button className="btn-violet" onClick={() => setIsEmployeeListOpen(true)}>Empleados</button>
      </div>

      {/* Calendar Card */}
      <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: '1rem' }}>
          {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).toUpperCase()}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(day => (
            <span key={day} style={{ fontSize: '0.9rem', fontWeight: 900, color: '#000' }}>{day}</span>
          ))}
          {Array.from({ length: 30 }, (_, i) => {
            const todayStr = getTodayStr();
            const [year, month] = todayStr.split('-');
            const day = i + 1;
            const formattedDay = `${year}-${month}-${day.toString().padStart(2, '0')}`;
            const isToday = formattedDay === getTodayStr();

            // Check if there are orders or deliveries on this day
            const hasOrder = orders.some(o => o.orderDate === formattedDay);
            const hasDelivery = orders.some(o => o.deliveryDate === formattedDay);
            const hasServiceRequest = serviceRequests.some(s => s.requestDate === formattedDay);
            const hasServiceExecution = serviceRequests.some(s => s.executionDate === formattedDay);
            const hasCall = calls.some(c => c.callDate === formattedDay);
            const hasReminder = scheduledReminders.some(r => r.date === formattedDay);

            return (
              <div
                key={day}
                onClick={() => handleDayClick(formattedDay)}
                className={`calendar-day ${isToday ? 'today' : ''}`}
              >
                <span style={{ fontSize: '1rem' }}>{day}</span>
                <div style={{ display: 'flex', gap: '2px', height: '6px' }}>
                  {(hasOrder || hasDelivery) && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-navy)' }} title="Pedido/Entrega"></div>
                  )}
                  {(hasServiceRequest || hasServiceExecution) && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-orange)' }} title="Servicio"></div>
                  )}
                  {hasCall && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-violet)' }} title="Llamada"></div>
                  )}
                  {hasReminder && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2196F3' }} title="Recordatorio"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: '1rem' }}>TAREAS PENDIENTES</h2>
        <hr style={{ border: '0', borderTop: '1px solid #eee', marginBottom: '0.8rem' }} />

        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="¿Qué falta hacer?"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            className="modal-input"
            style={{ fontSize: '1.1rem' }}
          />
          <button
            onClick={addTask}
            className="btn-navy"
            style={{ padding: '1rem 2rem', fontSize: '1rem', width: 'auto' }}
          >
            AÑADIR
          </button>
        </div>

        <ul style={{ maxHeight: '250px', overflowY: 'auto' }}>
          {pendingTasks.map(task => (
            <li key={task.id} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id, task.completed)}
                />
                {editingTaskId === task.id ? (
                  <input
                    type="text"
                    value={editingTaskText}
                    onChange={(e) => setEditingTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEditTask()}
                    className="modal-input"
                    style={{ padding: '0.3rem', fontSize: '0.9rem' }}
                    autoFocus
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{task.text}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📅 {task.date.split('-').reverse().join('/')}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {editingTaskId === task.id ? (
                  <button onClick={() => saveEditTask()} className="task-action-btn edit" style={{ opacity: 1 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </button>
                ) : (
                  <button onClick={() => startEditTask(task)} className="task-action-btn edit" title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                )}
                <button onClick={() => deleteTask(task.id)} className="task-action-btn delete" title="Eliminar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>


      {/* Action Buttons Row */}
      <div className="btn-action-row" style={{ gridColumn: '1 / span 3', display: 'flex', gap: '1rem' }}>
        <button className="btn-action" onClick={() => { setNewOrder(prev => ({ ...prev, orderDate: getTodayStr(), id: 0 })); setIsOrderModalOpen(true); }}>📦 Realizar pedido</button>
        <button className="btn-action-orange" onClick={() => { setNewServiceRequest(prev => ({ ...prev, requestDate: getTodayStr(), id: 0 })); setIsServiceRequestModalOpen(true); }}>🛠️ Solicitar servicio</button>
        <button className="btn-action-violet" onClick={() => { setNewCall(prev => ({ ...prev, callDate: getTodayStr(), id: 0 })); setIsCallModalOpen(true); }}>📞 Realizar llamada</button>
      </div>

      {/* Bottom Row - Side by Side */}
      <div className="card completed-tasks" style={{ gridColumn: '1 / span 2' }}>
        <h2 className="section-title">TAREAS REALIZADAS</h2>
        <ul>
          {completedTasks.map(task => (
            <li key={task.id} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id, task.completed)}
                />
                {editingTaskId === task.id ? (
                  <input
                    type="text"
                    value={editingTaskText}
                    onChange={(e) => setEditingTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEditTask()}
                    className="modal-input"
                    style={{ padding: '0.3rem', fontSize: '0.9rem' }}
                    autoFocus
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontWeight: 'bold' }}>{task.text}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.7 }}>{task.date.split('-').reverse().join('/')}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {editingTaskId === task.id ? (
                  <button onClick={() => saveEditTask()} className="task-action-btn edit" style={{ opacity: 1 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </button>
                ) : (
                  <button onClick={() => startEditTask(task)} className="task-action-btn edit" title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                )}
                <button onClick={() => deleteTask(task.id)} className="task-action-btn delete" title="Eliminar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2 className="section-title">RECORDATORIO</h2>
        <hr style={{ border: '0', borderTop: '1px solid #eee', marginBottom: '1rem' }} />
        <div
          className="modal-input"
          style={{
            height: '250px',
            width: '100%',
            overflowY: 'auto',
            background: 'transparent',
            border: 'none',
            fontSize: '1.2rem',
            lineHeight: '1.6'
          }}
        >
          {/* Lista de recordatorios del calendario */}
          {scheduledReminders.length > 0 && (
            <div style={{ color: 'var(--primary-navy)' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.7 }}>PRÓXIMAS FECHAS:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {scheduledReminders
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(r => (
                    <div key={r.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        {editingReminderId === r.id ? (
                          <input
                            type="text"
                            value={editingReminderText}
                            onChange={(e) => setEditingReminderText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditReminder()}
                            className="modal-input"
                            style={{ padding: '0.3rem', fontSize: '1rem' }}
                            autoFocus
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 900 }}>{r.text}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📅 {r.date.split('-').reverse().slice(0, 2).join('/')}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                        {editingReminderId === r.id ? (
                          <button onClick={saveEditReminder} className="task-action-btn edit" style={{ opacity: 1 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                        ) : (
                          <button onClick={() => startEditReminder(r)} className="task-action-btn edit" title="Editar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                        )}
                        <button onClick={() => deleteReminder(r.id)} className="task-action-btn delete" title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Provider List Modal */}
      {isProviderListOpen && (
        <div className="modal-overlay" onClick={() => setIsProviderListOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>LISTA DE PROVEEDORES</h2>
              <button onClick={() => setIsProviderListOpen(false)} style={{ background: 'none', border: 'none', fontSize: '2.5rem', cursor: 'pointer', color: '#000' }}>&times;</button>
            </div>

            <button
              onClick={() => {
                setSelectedProvider(null);
                setNewProvider({ name: '', phone: '', address: '', observations: '' });
                setIsAddProviderOpen(true);
              }}
              className="btn-navy"
              style={{ padding: '1.2rem', marginBottom: '2rem', fontSize: '1.1rem' }}
            >
              + AGREGAR NUEVO PROVEEDOR
            </button>

            <ul style={{ maxHeight: '450px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {providers.length === 0 && <p style={{ textAlign: 'center', gridColumn: 'span 2', color: '#666' }}>NO HAY PROVEEDORES AGENDADOS.</p>}
              {providers.map(provider => (
                <li
                  key={provider.id}
                  onClick={() => openEditProvider(provider)}
                  style={{
                    padding: '1.2rem',
                    background: 'white',
                    border: '3px solid #eee',
                    borderRadius: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '1.2rem', color: 'var(--primary-navy)' }}>{provider.name}</span>
                  <div style={{ fontSize: '1rem', color: '#444' }}>
                    <div>📞 {provider.phone}</div>
                    <div>📍 {provider.address}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Provider Form Modal (Add/Edit) */}
      {isAddProviderOpen && (
        <div className="modal-overlay" onClick={() => setIsAddProviderOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                {selectedProvider ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR'}
              </h2>
              <button onClick={() => setIsAddProviderOpen(false)} style={{ background: 'none', border: 'none', fontSize: '2.5rem', cursor: 'pointer', color: '#000' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '1rem', marginBottom: '0.5rem', color: '#666' }}>NOMBRE / COMERCIO</label>
                <input
                  type="text"
                  placeholder="Ej: Pinturería Central"
                  value={newProvider.name}
                  onChange={e => setNewProvider({ ...newProvider, name: e.target.value.toUpperCase() })}
                  className="modal-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '1rem', marginBottom: '0.5rem', color: '#666' }}>TELÉFONO</label>
                  <input
                    type="text"
                    placeholder="11 2233-4455"
                    value={newProvider.phone}
                    onChange={e => setNewProvider({ ...newProvider, phone: e.target.value.toUpperCase() })}
                    className="modal-input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '1rem', marginBottom: '0.5rem', color: '#666' }}>DIRECCIÓN</label>
                  <input
                    type="text"
                    placeholder="Calle Falsa 123"
                    value={newProvider.address}
                    onChange={e => setNewProvider({ ...newProvider, address: e.target.value.toUpperCase() })}
                    className="modal-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '1rem', marginBottom: '0.5rem', color: '#666' }}>OBSERVACIONES</label>
                <textarea
                  placeholder="Detalles de entrega, cobro, etc..."
                  value={newProvider.observations}
                  onChange={e => setNewProvider({ ...newProvider, observations: e.target.value.toUpperCase() })}
                  className="modal-input"
                  style={{ height: '120px', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {selectedProvider && (
                  <button
                    onClick={() => {
                      deleteProvider(selectedProvider.id);
                      setIsAddProviderOpen(false);
                    }}
                    style={{ flex: 1, padding: '1.2rem', background: '#e63946', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', fontSize: '1.1rem' }}
                  >
                    ELIMINAR
                  </button>
                )}
                <button
                  onClick={addProvider}
                  className="btn-navy"
                  style={{ flex: 2, padding: '1.2rem', fontSize: '1.3rem' }}
                >
                  {selectedProvider ? 'GUARDAR CAMBIOS' : 'GUARDAR PROVEEDOR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service List Modal */}
      {
        isServiceListOpen && (
          <div className="modal-overlay" onClick={() => setIsServiceListOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>LISTA DE SERVICIOS</h2>
                <button onClick={() => setIsServiceListOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  onClick={() => {
                    setSelectedService(null);
                    setNewService({ name: '', phone: '', address: '', observations: '' });
                    setIsAddServiceOpen(true);
                  }}
                  style={{ width: '100%', padding: '1rem', background: 'var(--primary-navy)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  + AGREGAR NUEVO SERVICIO
                </button>
              </div>

              <ul style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {services.length === 0 && <li style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>NO HAY SERVICIOS REGISTRADOS.</li>}
                {services.map(service => (
                  <li
                    key={service.id}
                    onClick={() => openEditService(service)}
                    style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: 'bold', color: 'var(--primary-navy)' }}>{service.name}</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div>📞 {service.phone}</div>
                      <div>📍 {service.address}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )
      }

      {/* Detailed View / Edit Service Modal */}
      {
        isAddServiceOpen && (
          <div className="modal-overlay" onClick={() => setIsAddServiceOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>{selectedService ? 'EDITAR SERVICIO' : 'NUEVO SERVICIO'}</h2>
                <button onClick={() => setIsAddServiceOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>NOMBRE DEL SERVICIO</label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={e => setNewService({ ...newService, name: e.target.value.toUpperCase() })}
                    className="modal-input"
                    placeholder="Ej: Mantenimiento Aires"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>TELÉFONO</label>
                    <input
                      type="text"
                      value={newService.phone}
                      onChange={e => setNewService({ ...newService, phone: e.target.value.toUpperCase() })}
                      className="modal-input"
                      placeholder="11 2233-4455"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>DIRECCIÓN</label>
                    <input
                      type="text"
                      value={newService.address}
                      onChange={e => setNewService({ ...newService, address: e.target.value.toUpperCase() })}
                      className="modal-input"
                      placeholder="Calle Falsa 123"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>OBSERVACIONES</label>
                  <textarea
                    value={newService.observations}
                    onChange={e => setNewService({ ...newService, observations: e.target.value.toUpperCase() })}
                    className="modal-input"
                    rows={4}
                    style={{ resize: 'none', textTransform: 'uppercase' }}
                    placeholder="Notas adicionales..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  {selectedService && (
                    <button
                      onClick={() => deleteService(selectedService.id)}
                      style={{ flex: 1, padding: '1rem', background: '#e63946', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ELIMINAR
                    </button>
                  )}
                  <button
                    onClick={addService}
                    className="btn-navy"
                    style={{ flex: 2, padding: '1rem' }}
                  >
                    {selectedService ? 'GUARDAR CAMBIOS' : 'GUARDAR SERVICIO'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Employee List Modal */}
      {
        isEmployeeListOpen && (
          <div className="modal-overlay" onClick={() => setIsEmployeeListOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>LISTA DE EMPLEADOS</h2>
                <button onClick={() => setIsEmployeeListOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  onClick={() => {
                    setSelectedEmployee(null);
                    setNewEmployee({ name: '', role: '', phone: '', observations: '' });
                    setIsAddEmployeeOpen(true);
                  }}
                  style={{ width: '100%', padding: '1rem', background: 'var(--primary-navy)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  + AGREGAR NUEVO EMPLEADO
                </button>
              </div>

              <ul style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {employees.length === 0 && <li style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>NO HAY EMPLEADOS REGISTRADOS.</li>}
                {employees.map(employee => (
                  <li
                    key={employee.id}
                    onClick={() => openEditEmployee(employee)}
                    style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: 'bold', color: 'var(--primary-navy)' }}>{employee.name}</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div>💼 {employee.role}</div>
                      <div>📞 {employee.phone}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )
      }

      {/* Detailed View / Edit Employee Modal */}
      {
        isAddEmployeeOpen && (
          <div className="modal-overlay" onClick={() => setIsAddEmployeeOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>{selectedEmployee ? 'EDITAR EMPLEADO' : 'NUEVO EMPLEADO'}</h2>
                <button onClick={() => setIsAddEmployeeOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>NOMBRE COMPLETO</label>
                  <input
                    type="text"
                    value={newEmployee.name}
                    onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value.toUpperCase() })}
                    className="modal-input"
                    placeholder="Ej: JUAN PÉREZ"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>PUESTO / ROL</label>
                    <input
                      type="text"
                      value={newEmployee.role}
                      onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value.toUpperCase() })}
                      className="modal-input"
                      placeholder="Ej: VENDEDOR"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>TELÉFONO</label>
                    <input
                      type="text"
                      value={newEmployee.phone}
                      onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value.toUpperCase() })}
                      className="modal-input"
                      placeholder="11 2233-4455"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>OBSERVACIONES</label>
                  <textarea
                    value={newEmployee.observations}
                    onChange={e => setNewEmployee({ ...newEmployee, observations: e.target.value.toUpperCase() })}
                    className="modal-input"
                    rows={4}
                    style={{ resize: 'none' }}
                    placeholder="TURNOS, DISPONIBILIDAD, ETC..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  {selectedEmployee && (
                    <button
                      onClick={() => deleteEmployee(selectedEmployee.id)}
                      style={{ flex: 1, padding: '1rem', background: '#e63946', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ELIMINAR
                    </button>
                  )}
                  <button
                    onClick={addEmployee}
                    className="btn-navy"
                    style={{ flex: 2, padding: '1rem' }}
                  >
                    {selectedEmployee ? 'GUARDAR CAMBIOS' : 'GUARDAR EMPLEADO'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Realizar Pedido Modal */}
      {
        isOrderModalOpen && (
          <div className="modal-overlay" onClick={() => setIsOrderModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>REALIZAR NUEVO PEDIDO</h2>
                <button onClick={() => setIsOrderModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>SELECCIONAR PROVEEDOR</label>
                  <select
                    className="modal-input"
                    value={newOrder.providerId}
                    onChange={e => setNewOrder({ ...newOrder, providerId: Number(e.target.value) })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="0">Seleccione un proveedor...</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>VINCULAR CON TAREA PENDIENTE (OPCIONAL)</label>
                  <select
                    className="modal-input"
                    value={newOrder.taskId || "0"}
                    onChange={e => setNewOrder({ ...newOrder, taskId: Number(e.target.value) })}
                    style={{ cursor: 'pointer', border: '4px solid var(--primary-navy-glow)' }}
                  >
                    <option value="0">Ninguna tarea...</option>
                    {pendingTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.text}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>FECHA DEL PEDIDO</label>
                    <input
                      type="date"
                      className="modal-input"
                      value={newOrder.orderDate}
                      onChange={e => setNewOrder({ ...newOrder, orderDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>FECHA DE ENTREGA ESTIMADA</label>
                    <input
                      type="date"
                      className="modal-input"
                      value={newOrder.deliveryDate}
                      onChange={e => setNewOrder({ ...newOrder, deliveryDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>DETALLE DEL PEDIDO</label>
                  <textarea
                    className="modal-input"
                    rows={5}
                    value={newOrder.orderDetails}
                    onChange={e => setNewOrder({ ...newOrder, orderDetails: e.target.value.toUpperCase() })}
                    style={{ resize: 'none' }}
                    placeholder="Escriba aquí los productos y cantidades..."
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>OBSERVACIONES</label>
                  <textarea
                    className="modal-input"
                    rows={3}
                    value={newOrder.observations}
                    onChange={e => setNewOrder({ ...newOrder, observations: e.target.value.toUpperCase() })}
                    style={{ resize: 'none' }}
                    placeholder="Notas adicionales sobre la entrega, pago, etc..."
                  />
                </div>

                <button
                  onClick={handleCreateOrder}
                  className="btn-navy"
                  style={{ padding: '1rem', marginTop: '1rem' }}
                  disabled={newOrder.providerId === 0 || !newOrder.orderDetails.trim()}
                >
                  REGISTRAR PEDIDO
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Solicitar Servicio Modal */}
      {
        isServiceRequestModalOpen && (
          <div className="modal-overlay" onClick={() => setIsServiceRequestModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>SOLICITAR NUEVO SERVICIO</h2>
                <button onClick={() => setIsServiceRequestModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>SELECCIONAR PROVEEDOR DE SERVICIO</label>
                  <select
                    className="modal-input"
                    value={newServiceRequest.serviceId}
                    onChange={e => setNewServiceRequest({ ...newServiceRequest, serviceId: Number(e.target.value) })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="0">Seleccione un prestador...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>VINCULAR CON TAREA PENDIENTE (OPCIONAL)</label>
                  <select
                    className="modal-input"
                    value={newServiceRequest.taskId || "0"}
                    onChange={e => setNewServiceRequest({ ...newServiceRequest, taskId: Number(e.target.value) })}
                    style={{ cursor: 'pointer', border: '4px solid var(--primary-orange-glow)' }}
                  >
                    <option value="0">Ninguna tarea...</option>
                    {pendingTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.text}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>FECHA DE SOLICITUD</label>
                    <input
                      type="date"
                      className="modal-input"
                      value={newServiceRequest.requestDate}
                      onChange={e => setNewServiceRequest({ ...newServiceRequest, requestDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>FECHA DE EJECUCIÓN / VISITA</label>
                    <input
                      type="date"
                      className="modal-input"
                      value={newServiceRequest.executionDate}
                      onChange={e => setNewServiceRequest({ ...newServiceRequest, executionDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>DETALLE DEL TRABAJO / PROBLEMA</label>
                  <textarea
                    className="modal-input"
                    rows={5}
                    value={newServiceRequest.details}
                    onChange={e => setNewServiceRequest({ ...newServiceRequest, details: e.target.value.toUpperCase() })}
                    style={{ resize: 'none' }}
                    placeholder="Describa el servicio solicitado..."
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>OBSERVACIONES</label>
                  <textarea
                    className="modal-input"
                    rows={3}
                    value={newServiceRequest.observations}
                    onChange={e => setNewServiceRequest({ ...newServiceRequest, observations: e.target.value.toUpperCase() })}
                    style={{ resize: 'none' }}
                    placeholder="Notas adicionales..."
                  />
                </div>

                <button
                  onClick={handleCreateServiceRequest}
                  className="btn-orange"
                  style={{ padding: '1rem', marginTop: '1rem' }}
                  disabled={newServiceRequest.serviceId === 0 || !newServiceRequest.details.trim()}
                >
                  REGISTRAR SOLICITUD
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Realizar Llamada Modal */}
      {
        isCallModalOpen && (
          <div className="modal-overlay" onClick={() => setIsCallModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>REGISTRAR LLAMADA</h2>
                <button onClick={() => setIsCallModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>SELECCIONAR EMPLEADO</label>
                  <select
                    className="modal-input"
                    value={newCall.employeeId}
                    onChange={e => setNewCall({ ...newCall, employeeId: Number(e.target.value) })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="0">Seleccione un empleado...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>VINCULAR CON TAREA PENDIENTE (OPCIONAL)</label>
                  <select
                    className="modal-input"
                    value={newCall.taskId || "0"}
                    onChange={e => setNewCall({ ...newCall, taskId: Number(e.target.value) })}
                    style={{ cursor: 'pointer', border: '4px solid var(--primary-violet-glow)' }}
                  >
                    <option value="0">Ninguna tarea...</option>
                    {pendingTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.text}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>FECHA DE LA LLAMADA</label>
                  <input
                    type="date"
                    className="modal-input"
                    value={newCall.callDate}
                    onChange={e => setNewCall({ ...newCall, callDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>MOTIVO DE LA LLAMADA</label>
                  <textarea
                    className="modal-input"
                    rows={4}
                    value={newCall.reason}
                    onChange={e => setNewCall({ ...newCall, reason: e.target.value.toUpperCase() })}
                    style={{ resize: 'none' }}
                    placeholder="Describa el motivo o resultado de la llamada..."
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>OBSERVACIONES</label>
                  <textarea
                    className="modal-input"
                    rows={2}
                    value={newCall.observations}
                    onChange={e => setNewCall({ ...newCall, observations: e.target.value.toUpperCase() })}
                    style={{ resize: 'none' }}
                    placeholder="Notas adicionales..."
                  />
                </div>

                <button
                  onClick={handleCreateCall}
                  className="btn-violet"
                  style={{ padding: '1rem', marginTop: '1rem' }}
                  disabled={newCall.employeeId === 0 || !newCall.reason.trim()}
                >
                  REGISTRAR LLAMADA
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Day Modal (Actions/Reminders) */}
      {
        isDayModalOpen && (
          <div className="modal-overlay" onClick={() => setIsDayModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>DÍA: {selectedDate}</h2>
                <button onClick={() => setIsDayModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
              </div>

              {new Date(selectedDate + 'T00:00:00') >= new Date(getTodayStr() + 'T00:00:00') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Botones de acción rápida solo para el día de hoy */}
                  {selectedDate === getTodayStr() && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <button className="btn-action" onClick={() => { setIsDayModalOpen(false); setIsOrderModalOpen(true); }} style={{ padding: '1.2rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.8rem' }}>📦</span> REALIZAR PEDIDO
                      </button>
                      <button className="btn-action-orange" onClick={() => { setIsDayModalOpen(false); setIsServiceRequestModalOpen(true); }} style={{ padding: '1.2rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.8rem' }}>🛠️</span> SOLICITAR SERVICIO
                      </button>
                      <button className="btn-action-violet" onClick={() => { setIsDayModalOpen(false); setIsCallModalOpen(true); }} style={{ padding: '1.2rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.8rem' }}>📞</span> REGISTRAR LLAMADA
                      </button>
                      <hr style={{ border: '0', borderTop: '2px dashed #eee', margin: '0.8rem 0' }} />
                    </div>
                  )}

                  {/* Solo mostrar agregar recordatorio si NO es el día de hoy */}
                  {selectedDate !== getTodayStr() && (
                    <div className="card" style={{ padding: '1.5rem', background: '#f8fafc' }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>AGREGAR RECORDATORIO</h3>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="modal-input"
                          placeholder="Ej: Comprar pintura..."
                          value={newReminderText}
                          onChange={e => setNewReminderText(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === 'Enter' && addScheduledReminder()}
                        />
                        <button onClick={addScheduledReminder} className="btn-navy" style={{ width: 'auto', padding: '0 1.5rem' }}>+</button>
                      </div>
                    </div>
                  )}

                  {selectedDate !== getTodayStr() && (
                    <div>
                      <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>RECORDATORIOS DEL DÍA</h3>
                      <ul>
                        {scheduledReminders.filter(r => r.date === selectedDate).map(r => (
                          <li key={r.id} style={{ fontSize: '1rem', padding: '1rem' }}>{r.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* También mostrar acciones programadas para hoy/futuro */}
                  {[
                    ...orders.filter(o => o.orderDate === selectedDate || o.deliveryDate === selectedDate).map(o => ({ ...o, displayType: o.orderDate === selectedDate ? 'PEDIDO' : 'ENTREGA' })),
                    ...serviceRequests.filter(s => s.requestDate === selectedDate || s.executionDate === selectedDate).map(s => ({ ...s, displayType: s.requestDate === selectedDate ? 'SOLICITUD SERVICIO' : 'VISITA SERVICIO' })),
                    ...calls.filter(c => c.callDate === selectedDate).map(c => ({ ...c, displayType: 'LLAMADA' }))
                  ].length > 0 && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>ACCIONES PROGRAMADAS</h3>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {[
                            ...orders.filter(o => o.orderDate === selectedDate || o.deliveryDate === selectedDate).map(o => ({ ...o, displayType: o.orderDate === selectedDate ? 'PEDIDO' : 'ENTREGA' })),
                            ...serviceRequests.filter(s => s.requestDate === selectedDate || s.executionDate === selectedDate).map(s => ({ ...s, displayType: s.requestDate === selectedDate ? 'SOLICITUD SERVICIO' : 'VISITA SERVICIO' })),
                            ...calls.filter(c => c.callDate === selectedDate).map(c => ({ ...c, displayType: 'LLAMADA' }))
                          ].map((action, idx) => {
                            const personName =
                              action.type === 'order' ? providers.find(p => p.id === action.providerId)?.name :
                                action.type === 'service' ? services.find(s => s.id === action.serviceId)?.name :
                                  action.type === 'call' ? employees.find(e => e.id === action.employeeId)?.name : 'N/A';

                            return (
                              <li
                                key={idx}
                                onClick={() => { setSelectedAction({ ...action, personName }); setIsDetailModalOpen(true); }}
                                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: '1rem', background: '#f0f9ff', border: '2px solid #bae6fd', alignItems: 'stretch' }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                  <span style={{ fontWeight: 900, color: 'var(--primary-navy)' }}>{action.displayType}</span>
                                  <span style={{ fontSize: '0.8rem' }}>VER DETALLE &raquo;</span>
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '0.2rem', color: '#000' }}>
                                  {personName}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>ACCIONES REALIZADAS</h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      ...orders.filter(o => o.orderDate === selectedDate || o.deliveryDate === selectedDate).map(o => ({ ...o, displayType: o.orderDate === selectedDate ? 'PEDIDO' : 'ENTREGA' })),
                      ...serviceRequests.filter(s => s.requestDate === selectedDate || s.executionDate === selectedDate).map(s => ({ ...s, displayType: s.requestDate === selectedDate ? 'SOLICITUD SERVICIO' : 'VISITA SERVICIO' })),
                      ...calls.filter(c => c.callDate === selectedDate).map(c => ({ ...c, displayType: 'LLAMADA' }))
                    ].map((action, idx) => {
                      const personName =
                        action.type === 'order' ? providers.find(p => p.id === action.providerId)?.name :
                          action.type === 'service' ? services.find(s => s.id === action.serviceId)?.name :
                            action.type === 'call' ? employees.find(e => e.id === action.employeeId)?.name : 'N/A';

                      return (
                        <li
                          key={idx}
                          onClick={() => { setSelectedAction({ ...action, personName }); setIsDetailModalOpen(true); }}
                          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: '1.2rem', background: '#f8fafc', alignItems: 'stretch' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ fontWeight: 900, color: 'var(--primary-navy)' }}>{action.displayType}</span>
                            <span style={{ fontSize: '0.8rem' }}>VER DETALLE &raquo;</span>
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.2rem' }}>
                            {personName}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Detail Modal */}
      {
        isDetailModalOpen && (
          <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>DETALLE</h2>
                <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '1.1rem' }}>
                <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#64748b' }}>TIPO</label>
                  <div style={{ fontWeight: 900 }}>{selectedAction?.displayType}</div>
                </div>

                <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#64748b' }}>NOMBRE / RESPONSABLE</label>
                  <div style={{ fontWeight: 900 }}>{selectedAction?.personName}</div>
                </div>

                <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#64748b' }}>DETALLE / MOTIVO</label>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{selectedAction?.orderDetails || selectedAction?.details || selectedAction?.reason}</div>
                </div>

                {selectedAction?.observations && (
                  <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748b' }}>OBSERVACIONES</label>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{selectedAction.observations}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    className="btn-navy"
                    onClick={() => handleEditAction(selectedAction)}
                    style={{ flex: 1, padding: '1rem' }}
                  >
                    EDITAR
                  </button>
                  <button
                    className="btn-orange"
                    onClick={() => handleDeleteAction(selectedAction)}
                    style={{ flex: 1, padding: '1rem' }}
                  >
                    ELIMINAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}

export default App
