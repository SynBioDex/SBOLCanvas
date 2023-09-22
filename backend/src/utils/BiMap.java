package utils;

import java.util.HashMap;
import java.util.Set;

public class BiMap<K,V> {
	private HashMap<K,V> forward;
	private HashMap<V,K> backward;
	
	public BiMap(){
		forward = new HashMap<K,V>();
		backward = new HashMap<V,K>();
	}
	
	public void put(K key, V value) {
		forward.put(key, value);
		backward.put(value, key);
	}
	
	public boolean ContainsKey(K key) {
		return forward.containsKey(key);
	}
	
	public boolean containsValue(V value) {
		return backward.containsKey(value);
	}
	
	public V getValue(K key) {
		return forward.get(key);
	}
	
	public K getKey(V value) {
		return backward.get(value);
	}
	
	public Set<V> values(){
		return backward.keySet();
	}
	
	public Set<K> keys(){
		return forward.keySet();
	}
}
